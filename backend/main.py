import os
import json
import tempfile
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_openai import ChatOpenAI

from crewai import Agent, Task, Crew

# -------------------------
# CONFIG
# -------------------------

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY environment variable is required")

llm = ChatOpenAI(model_name="gpt-4o", temperature=0.4, api_key=api_key)

app = FastAPI(title="CareMatch AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# PYDANTIC MODELS
# -------------------------

class CareTypeExperience(BaseModel):
    years: float = 0
    conditions_experienced: list[str] = []
    tasks_performed: list[str] = []

class EldercareExperience(CareTypeExperience):
    medical_care: list[str] = []

class ChildcareExperience(CareTypeExperience):
    age_range: list[str] = []

class SpecialNeedsExperience(CareTypeExperience):
    therapies_supported: list[str] = []

class PostSurgeryExperience(BaseModel):
    years: float = 0
    surgeries_supported: list[str] = []
    tasks_performed: list[str] = []
    recovery_phases: list[str] = []

class DementiaExperience(BaseModel):
    years: float = 0
    dementia_types: list[str] = []
    tasks_performed: list[str] = []
    stages_experienced: list[str] = []

class DisabilityExperience(BaseModel):
    years: float = 0
    disability_types: list[str] = []
    tasks_performed: list[str] = []
    specialized_skills: list[str] = []

class CaregivingExperience(BaseModel):
    eldercare: EldercareExperience | None = None
    childcare: ChildcareExperience | None = None
    special_needs: SpecialNeedsExperience | None = None
    post_surgery: PostSurgeryExperience | None = None
    dementia: DementiaExperience | None = None
    disability: DisabilityExperience | None = None

class CaregiverProfile(BaseModel):
    id: str = ""
    name: str
    careTypes: list[str]
    yearsOfExperience: float
    languages: list[str]
    skills: list[str]
    certifications: list[str]
    summary: str
    rawText: str = ""
    caregiving_experience: CaregivingExperience | None = None


class MatchExplanation(BaseModel):
    overallFit: str
    strengths: list[str]
    gaps: list[str]
    recommendation: str
    caregiving_experience: CaregivingExperience | None = None


def sanitize_experience_data(exp_data: dict) -> dict:
    """
    Sanitize caregiving experience data to ensure proper types.
    Converts 'years' field from string to float if needed.
    """
    if not exp_data:
        return {}

    cleaned = exp_data.copy()

    # Convert years field to float
    if "years" in cleaned:
        years_value = cleaned["years"]
        print(f"[DEBUG] sanitize_experience_data - years_value: {years_value}, type: {type(years_value)}")
        if isinstance(years_value, str):
            try:
                cleaned["years"] = float(years_value) if years_value.strip() else 0.0
                print(f"[DEBUG] Converted string to float: {cleaned['years']}")
            except (ValueError, AttributeError):
                cleaned["years"] = 0.0
                print(f"[DEBUG] Failed to convert, defaulting to 0.0")
        elif years_value is None:
            cleaned["years"] = 0.0
            print(f"[DEBUG] years_value was None, defaulting to 0.0")
        else:
            print(f"[DEBUG] years_value already numeric: {years_value}")
    else:
        print(f"[DEBUG] No 'years' field in exp_data: {exp_data}")

    return cleaned


class MatchResult(BaseModel):
    caregiver: CaregiverProfile
    score: float
    rank: int
    match_badge: str
    explanation: MatchExplanation


class CareRequirements(BaseModel):
    careType: str
    languages: list[str]
    specialConsiderations: list[str]
    overnightCare: bool
    experienceLevel: str
    additionalNotes: str


class MatchRequest(BaseModel):
    profiles: list[CaregiverProfile]
    requirements: CareRequirements


class ParseResumeResponse(BaseModel):
    extractedText: str
    profile: CaregiverProfile


# -------------------------
# HELPER FUNCTIONS
# -------------------------

def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from a PDF file using PyMuPDFLoader."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        loader = PyMuPDFLoader(tmp_path)
        pages = loader.load()
        text = "\n".join([p.page_content for p in pages])
        return text
    finally:
        os.unlink(tmp_path)


def parse_json_from_text(text: str) -> dict | list:
    """Extract JSON from agent output text, handling markdown code blocks."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first and last lines (``` markers)
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines)
    return json.loads(cleaned)


# -------------------------
# CREWAI AGENT FACTORIES
# -------------------------

def create_resume_parsing_agent(llm: ChatOpenAI) -> Agent:
    return Agent(
        role="Caregiver Resume Parsing Agent",
        goal="Extract caregiving‑relevant structured JSON from a resume.",
        backstory=(
            "Use the resume uploaded (uploaded_files) to retrieve information. "
            "Generate a JSON object per resume."
        ),
        verbose=False,
        allow_delegation=False,
        llm=llm,
    )


def create_matching_agent(llm: ChatOpenAI) -> Agent:
    return Agent(
        role="Caregiver Matching Agent",
        goal="Rank the candidates based on the candidate's resume and the employer care requirements.",
        backstory=(
            "Compare candidate profiles from the parsed_resumes with employer_json. "
            "Provide a ranking report and explain the ranking."
        ),
        verbose=False,
        allow_delegation=False,
        llm=llm,
    )


# -------------------------
# CREWAI TASK TEMPLATES
# -------------------------

PARSE_RESUME_EXPECTED_OUTPUT = """
{
  "candidate_name": "Full name of the candidate as shown on their resume",
  "careTypes": "Array of care types the candidate has experience in. Valid values: childcare, eldercare, special-needs, post-surgery, dementia, disability, not applicable",
  "totalYearsOfExperience": "Total number of years of relevant caregiving experience across all care types (numeric value)",
  "languages": "Array of languages the candidate speaks fluently",
  "skills": "Array of specific caregiving skills, techniques, or competencies the candidate possesses",
  "certifications": "Array of professional certifications, licenses, or credentials relevant to caregiving (e.g., CPR, First Aid, CNA)",
  "summary": "A concise 2-3 sentence summary highlighting the candidate's caregiving background, key strengths, and areas of expertise",
  "caregiving_experience": {
    "eldercare": {
      "years": "EXTRACT the actual number of years of eldercare experience from the resume. If the resume states '5 years', return 5. If '3+ years', return 3. If experience is mentioned but no years specified, estimate based on employment dates. Only return 0 if the candidate has NO eldercare experience at all.",
      "conditions_experienced": "Array of specific conditions or health issues the candidate has experience managing in elderly patients (e.g., Alzheimer's, Parkinson's, mobility issues). Empty array if not applicable",
      "tasks_performed": "Array of specific eldercare tasks the candidate has performed (e.g., medication management, personal hygiene assistance, meal preparation). Empty array if not applicable",
      "medical_care": "Array of medical care tasks the candidate can perform for elderly patients (e.g., wound care, catheter care, vital signs monitoring). Empty array if not applicable"
    },
    "childcare": {
      "years": "EXTRACT the actual number of years of childcare experience from the resume. If the resume states '5 years', return 5. If '3+ years', return 3. If experience is mentioned but no years specified, estimate based on employment dates. Only return 0 if the candidate has NO childcare experience at all.",
      "conditions_experienced": "Array of specific conditions or special needs the candidate has experience with in children (e.g., autism, ADHD, developmental delays). Empty array if not applicable",
      "tasks_performed": "Array of specific childcare tasks the candidate has performed (e.g., feeding, diaper changing, homework assistance, activity planning). Empty array if not applicable",
      "age_range": "Array indicating the age ranges of children the candidate has experience caring for (e.g., infant, toddler, school-age, teenager). Empty array if not applicable"
    },
    "special-needs": {
      "years": "EXTRACT the actual number of years of special needs care experience from the resume. If the resume states '5 years', return 5. If '3+ years', return 3. If experience is mentioned but no years specified, estimate based on employment dates. Only return 0 if the candidate has NO special needs experience at all.",
      "conditions_experienced": "Array of specific special needs conditions the candidate has experience with (e.g., autism spectrum disorder, cerebral palsy, Down syndrome). Empty array if not applicable",
      "tasks_performed": "Array of special needs care tasks performed (e.g., behavioral support, adaptive equipment assistance, communication support). Empty array if not applicable",
      "therapies_supported": "Array of therapies the candidate has supported (e.g., occupational therapy, speech therapy, physical therapy). Empty array if not applicable"
    },
    "post-surgery": {
      "years": "EXTRACT the actual number of years of post-surgical care experience from the resume. If the resume states '5 years', return 5. If '3+ years', return 3. If experience is mentioned but no years specified, estimate based on employment dates. Only return 0 if the candidate has NO post-surgery experience at all.",
      "surgeries_supported": "Array of types of surgeries the candidate has provided post-operative care for (e.g., orthopedic, cardiac, abdominal). Empty array if not applicable",
      "tasks_performed": "Array of post-surgical care tasks performed (e.g., wound care, mobility assistance, medication management, drain care). Empty array if not applicable",
      "recovery_phases": "Array of recovery phases the candidate has experience with (e.g., immediate post-op, rehabilitation, long-term recovery). Empty array if not applicable"
    },
    "dementia": {
      "years": "EXTRACT the actual number of years of dementia care experience from the resume. If the resume states '5 years', return 5. If '3+ years', return 3. If experience is mentioned but no years specified, estimate based on employment dates. Only return 0 if the candidate has NO dementia care experience at all.",
      "dementia_types": "Array of dementia types the candidate has experience caring for (e.g., Alzheimer's, vascular dementia, Lewy body dementia). Empty array if not applicable",
      "tasks_performed": "Array of dementia-specific care tasks performed (e.g., memory care activities, behavioral management, safety monitoring, routine establishment). Empty array if not applicable",
      "stages_experienced": "Array of dementia stages the candidate has experience with (e.g., early-stage, moderate, advanced). Empty array if not applicable"
    },
    "disability": {
      "years": "EXTRACT the actual number of years of disability care experience from the resume. If the resume states '5 years', return 5. If '3+ years', return 3. If experience is mentioned but no years specified, estimate based on employment dates. Only return 0 if the candidate has NO disability care experience at all.",
      "disability_types": "Array of disability types the candidate has experience with (e.g., physical disabilities, intellectual disabilities, sensory disabilities). Empty array if not applicable",
      "tasks_performed": "Array of disability care tasks performed (e.g., mobility assistance, ADL support, assistive technology use, adaptive equipment). Empty array if not applicable",
      "specialized_skills": "Array of specialized skills for disability care (e.g., sign language, lift operation, feeding tube care). Empty array if not applicable"
    }
  }
}
"""

MATCH_EXPECTED_OUTPUT = """
[
  {
    "match_rank": "Integer ranking of candidate, 1 = best match",
    "match_score": "Numeric score from 0-100 indicating overall match suitability",
    "match_badge": "String indicating match quality. Must be one of: 'Top Match' (score >= 85), 'Strong Match' (score >= 70), 'Good Match' (score >= 50), or 'No Match' (score < 50)",
    "candidate_profile": {
      "candidate_name": "Full name of the candidate as shown on their resume",
      "care_types": "List of care types the candidate has experience in (e.g. eldercare, childcare)",
      "languages": "Languages the candidate speaks",
      "totalYearsOfExperience": "Total years of relevant caregiving experience",
      "summary": "Brief 1-2 sentence summary of the candidate's caregiving background"
    },
    "match_report": {
      "why_match": {
        "explanation": "1-2 sentence explanation of why this candidate is a good or poor fit for the requirements based on their caregiving experience",
        "caregiving_experience": {
          "note": "Dynamically include ONLY the care type objects that: (1) exist in the candidate's resume, AND (2) match the employer's care requirements. Omit all other care types. Use the exact same structure and field names from PARSE_RESUME_EXPECTED_OUTPUT",
          "eldercare": {
            "years": "Include if candidate has eldercare experience AND employer requires eldercare",
            "conditions_experienced": "Array from candidate's resume if relevant to match",
            "tasks_performed": "Array from candidate's resume if relevant to match",
            "medical_care": "Array from candidate's resume if relevant to match"
          },
          "childcare": {
            "years": "Include if candidate has childcare experience AND employer requires childcare",
            "conditions_experienced": "Array from candidate's resume if relevant to match",
            "tasks_performed": "Array from candidate's resume if relevant to match",
            "age_range": "Array from candidate's resume if relevant to match"
          },
          "special-needs": {
            "years": "Include if candidate has special-needs experience AND employer requires special-needs care",
            "conditions_experienced": "Array from candidate's resume if relevant to match",
            "tasks_performed": "Array from candidate's resume if relevant to match",
            "therapies_supported": "Array from candidate's resume if relevant to match"
          },
          "post-surgery": {
            "years": "Include if candidate has post-surgery experience AND employer requires post-surgical care",
            "surgeries_supported": "Array from candidate's resume if relevant to match",
            "tasks_performed": "Array from candidate's resume if relevant to match",
            "recovery_phases": "Array from candidate's resume if relevant to match"
          },
          "dementia": {
            "years": "Include if candidate has dementia care experience AND employer requires dementia care",
            "dementia_types": "Array from candidate's resume if relevant to match",
            "tasks_performed": "Array from candidate's resume if relevant to match",
            "stages_experienced": "Array from candidate's resume if relevant to match"
          },
          "disability": {
            "years": "Include if candidate has disability care experience AND employer requires disability care",
            "disability_types": "Array from candidate's resume if relevant to match",
            "tasks_performed": "Array from candidate's resume if relevant to match",
            "specialized_skills": "Array from candidate's resume if relevant to match"
          }
        }
      },
      "key_strengths": ["List of the candidate's key strengths relevant to the employer requirements"],
      "gaps_or_considerations": ["List of gaps or areas of concern relative to the requirements"],
      "recommendation": "A specific actionable recommendation for next steps with this candidate"
    }
  }
]
"""


# -------------------------
# API ENDPOINTS
# -------------------------

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/parse-resume", response_model=ParseResumeResponse)
async def parse_resume(file: UploadFile = File(...)):
    """Upload a PDF resume and get a structured caregiver profile."""
    agent = create_resume_parsing_agent(llm)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    # Extract text from PDF
    try:
        extracted_text = extract_pdf_text(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract text from PDF: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=422, detail="No text content found in PDF")

    # Debug: Show what text was extracted
    print(f"[DEBUG EXTRACTED TEXT] Full text length: {len(extracted_text)} chars")
    print(f"[DEBUG EXTRACTED TEXT] Full text:\n{extracted_text}\n")
    print("=" * 80)

    # Use CrewAI to parse the resume
    parse_task = Task(
        description=(
            "Parse a single caregiver resume into a structured JSON object.\n\n"
            f"Resume text:\n---\n{extracted_text}\n---\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. Extract all caregiving-relevant information.\n"
            "2. For caregiving_experience.years fields: YOU MUST extract the ACTUAL number of years from the resume text.\n"
            "   - If the resume states '5 years of eldercare', set years to 5\n"
            "   - If it says '3+ years', set years to 3\n"
            "   - If no explicit years are mentioned, calculate based on employment date ranges (e.g., '2018-2023' = 5 years)\n"
            "   - ONLY set years to 0 if the candidate has absolutely NO experience in that care type\n"
            "   - DO NOT default to 0 when experience is present\n"
            "3. Allowed careTypes: childcare, eldercare, special-needs, post-surgery, dementia, disability, not applicable.\n"
            "4. Return ONLY a valid JSON object with no additional text."
        ),
        expected_output=PARSE_RESUME_EXPECTED_OUTPUT,
        agent=agent,
    )

    crew = Crew(
        agents=[agent],
        tasks=[parse_task],
        verbose=False,
    )

    try:
        result = crew.kickoff()
        print(f"[DEBUG AI RAW RESPONSE]:\n{result.raw}\n")
        print("=" * 80)
        profile_data = parse_json_from_text(result.raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI agent returned invalid JSON for resume parsing")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")

    # Validate and normalize care types
    valid_care_types = {"childcare", "eldercare", "special-needs", "post-surgery", "dementia", "disability", "not-applicable"}
    care_types = [ct for ct in profile_data.get("careTypes", []) if ct in valid_care_types]

    # Extract caregiving experience
    caregiving_exp_data = profile_data.get("caregiving_experience", {})
    print(f"[DEBUG RESUME] caregiving_exp_data from AI: {caregiving_exp_data}")
    caregiving_experience = None
    if caregiving_exp_data:
        caregiving_experience = CaregivingExperience(
            eldercare=EldercareExperience(**sanitize_experience_data(caregiving_exp_data.get("eldercare", {}))) if caregiving_exp_data.get("eldercare") else None,
            childcare=ChildcareExperience(**sanitize_experience_data(caregiving_exp_data.get("childcare", {}))) if caregiving_exp_data.get("childcare") else None,
            special_needs=SpecialNeedsExperience(**sanitize_experience_data(caregiving_exp_data.get("special-needs", {}))) if caregiving_exp_data.get("special-needs") else None,
            post_surgery=PostSurgeryExperience(**sanitize_experience_data(caregiving_exp_data.get("post-surgery", {}))) if caregiving_exp_data.get("post-surgery") else None,
            dementia=DementiaExperience(**sanitize_experience_data(caregiving_exp_data.get("dementia", {}))) if caregiving_exp_data.get("dementia") else None,
            disability=DisabilityExperience(**sanitize_experience_data(caregiving_exp_data.get("disability", {}))) if caregiving_exp_data.get("disability") else None,
        )

    # Map from backend.py field names (candidate_name, totalYearsOfExperience) to frontend fields
    profile = CaregiverProfile(
        name=profile_data.get("candidate_name", profile_data.get("name", "Unknown")),
        careTypes=care_types if care_types else ["No Relevant Experience"],
        yearsOfExperience=float(profile_data.get("totalYearsOfExperience", profile_data.get("yearsOfExperience", 0))),
        languages=profile_data.get("languages", ["English"]),
        skills=profile_data.get("skills", []),
        certifications=profile_data.get("certifications", []),
        summary=profile_data.get("summary", "Caregiver profile parsed from resume."),
        rawText=extracted_text,
        caregiving_experience=caregiving_experience,
    )

    return ParseResumeResponse(extractedText=extracted_text, profile=profile)


@app.post("/api/match", response_model=list[MatchResult])
async def match_caregivers(request: MatchRequest):
    """Match caregiver profiles against employer requirements."""
    agent = create_matching_agent(llm)

    if not request.profiles:
        raise HTTPException(status_code=400, detail="At least one caregiver profile is required")

    # Build profiles summary for the agent
    profiles_summary = []
    for p in request.profiles:
        profile_dict = {
            "id": p.id,
            "name": p.name,
            "careTypes": p.careTypes,
            "yearsOfExperience": p.yearsOfExperience,
            "languages": p.languages,
            "skills": p.skills,
            "certifications": p.certifications,
            "summary": p.summary,
        }
        # Include caregiving_experience if available
        if p.caregiving_experience:
            profile_dict["caregiving_experience"] = p.caregiving_experience.model_dump(exclude_none=True)
        profiles_summary.append(profile_dict)

    requirements_summary = {
        "careType": request.requirements.careType,
        "languages": request.requirements.languages,
        "specialConsiderations": request.requirements.specialConsiderations,
        "overnightCare": request.requirements.overnightCare,
        "experienceLevel": request.requirements.experienceLevel,
        "additionalNotes": request.requirements.additionalNotes,
    }

    match_task = Task(
        description=(
        "You are evaluating candidate resumes against employer requirements.\n\n"

        "INPUT DATA:\n"
        f"parsed_resumes:\n{json.dumps(profiles_summary, indent=2)}\n\n"
        f"employer_json:\n{json.dumps(requirements_summary, indent=2)}\n\n"

        "OBJECTIVE:\n"
        "Match each candidate strictly against the employer_json requirements and rank them by suitability.\n\n"

        "SCORING RULES (MANDATORY):\n"
        "1. The score MUST reflect how well the candidate satisfies the employer's stated requirements — NOT general quality.\n"
        "2. If a candidate has NO relevant experience matching the core requirements, the score MUST be 0.\n"
        "3. Do NOT infer skills that are not explicitly present in the resume.\n"
        "4. Prefer exact, demonstrated evidence over assumptions.\n\n"

        "SCORING METHODOLOGY:\n"
        "1. Care Type Match (30 points):\n"
        "- Direct prior experience with the requested careType.\n"
        "- If no relevant careType experience → FINAL SCORE MUST BE 0.\n\n"

        "2. Experience Level Fit (25 points):\n"
        "- Compare candidate years/intensity of caregiving with requested experienceLevel.\n"
        "- Overqualified is acceptable but not required.\n\n"

        "3. Language Compatibility (20 points):\n"
        "- Must match at least ONE required language.\n"
        "- If no shared language → FINAL SCORE MUST BE 0.\n\n"

        "4. Special Considerations (15 points):\n"
        "- Evaluate ability to handle listed medical/behavioral/mobility needs.\n"
        "- If employer lists critical care needs and candidate lacks them → SCORE 0.\n\n"

        "5. Overnight Care Availability (5 points):\n"
        "- If overnightCare is true, candidate must explicitly support overnight.\n"
        "- If required but unavailable → SCORE 0.\n\n"

        "6. Additional Notes Alignment (5 points):\n"
        "- Match personality fit, preferences, religion, gender preference, schedule nuance, etc.\n"
        "- This is a minor adjustment only.\n\n"

        "GENERAL RULES:\n"
        "- Base scoring ONLY on explicit resume evidence.\n"
        "- Do NOT assume skills.\n"
        "- Safety and care relevance outweigh everything else.\n"
        "- A strong resume with wrong care experience must still score LOW.\n\n"

        "- If Required Skills Match is 0%, the FINAL score MUST be 0.\n"
        "- Scores must range from 0–100 and reflect requirement alignment, not resume strength.\n\n"

        "RANKING:\n"
        "- Rank candidates from most suitable to least suitable.\n"
        "- Rank 1 = best match to employer requirements.\n"
        "- Multiple weak matches should still score low even if they are strong candidates generally.\n\n"
    ),
        expected_output=MATCH_EXPECTED_OUTPUT,
        agent=agent,
    )

    crew = Crew(
        agents=[agent],
        tasks=[match_task],
        verbose=False,
    )

    try:
        result = crew.kickoff()
        match_data = parse_json_from_text(result.raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI agent returned invalid JSON for matching")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")

    if not isinstance(match_data, list):
        raise HTTPException(status_code=500, detail="AI agent returned unexpected format")

    # Build a lookup of profiles by id and name for mapping back
    profile_lookup_by_id = {p.id: p for p in request.profiles}
    profile_lookup_by_name = {p.name.lower(): p for p in request.profiles}

    results: list[MatchResult] = []
    for item in match_data:
        # Handle backend.py format: candidate_profile.candidate_name
        # Also handle flat format: id, name
        candidate_profile = item.get("candidate_profile", {})
        caregiver_id = item.get("id", "")
        caregiver_name = (
            candidate_profile.get("candidate_name", "")
            or item.get("name", "")
        )

        # Find the matching profile - try by id first, then by name
        profile = (
            profile_lookup_by_id.get(caregiver_id)
            or profile_lookup_by_name.get(caregiver_name.lower())
        )

        if not profile:
            # If we can't match, skip this entry
            continue

        match_report = item.get("match_report", {})

        strengths = match_report.get("key_strengths", [])
        if isinstance(strengths, str):
            strengths = [strengths]

        gaps = match_report.get("gaps_or_considerations", [])
        if isinstance(gaps, str):
            gaps = [gaps]

        # Handle new why_match structure (object with explanation and caregiving_experience)
        why_match_data = match_report.get("why_match", {})
        if isinstance(why_match_data, dict):
            overall_fit = why_match_data.get("explanation", "")
            # Extract caregiving_experience from why_match
            caregiving_exp_data = why_match_data.get("caregiving_experience", {})
            print(f"[DEBUG MATCH] caregiving_exp_data from why_match: {caregiving_exp_data}")
            match_caregiving_experience = None
            if caregiving_exp_data and isinstance(caregiving_exp_data, dict):
                # Remove 'note' field if present
                caregiving_exp_data.pop("note", None)
                match_caregiving_experience = CaregivingExperience(
                    eldercare=EldercareExperience(**sanitize_experience_data(caregiving_exp_data.get("eldercare", {}))) if caregiving_exp_data.get("eldercare") else None,
                    childcare=ChildcareExperience(**sanitize_experience_data(caregiving_exp_data.get("childcare", {}))) if caregiving_exp_data.get("childcare") else None,
                    special_needs=SpecialNeedsExperience(**sanitize_experience_data(caregiving_exp_data.get("special-needs", {}))) if caregiving_exp_data.get("special-needs") else None,
                    post_surgery=PostSurgeryExperience(**sanitize_experience_data(caregiving_exp_data.get("post-surgery", {}))) if caregiving_exp_data.get("post-surgery") else None,
                    dementia=DementiaExperience(**sanitize_experience_data(caregiving_exp_data.get("dementia", {}))) if caregiving_exp_data.get("dementia") else None,
                    disability=DisabilityExperience(**sanitize_experience_data(caregiving_exp_data.get("disability", {}))) if caregiving_exp_data.get("disability") else None,
                )
        else:
            # Fallback for old format (string)
            overall_fit = str(why_match_data) if why_match_data else ""
            match_caregiving_experience = None

        # Get match_badge from AI or calculate fallback based on score
        score = float(item.get("match_score", 0))
        match_badge = item.get("match_badge", "")

        # If AI didn't provide match_badge, calculate it based on score
        if not match_badge:
            if score >= 85:
                match_badge = "Top Match"
            elif score >= 70:
                match_badge = "Strong Match"
            elif score >= 50:
                match_badge = "Good Match"
            else:
                match_badge = "No Match"

        print(f"[DEBUG MATCH] match_badge: {match_badge}, score: {score}")

        results.append(MatchResult(
            caregiver=profile,
            score=score,
            rank=int(item.get("match_rank", 0)),
            match_badge=match_badge,
            explanation=MatchExplanation(
                overallFit=overall_fit,
                strengths=strengths,
                gaps=gaps,
                recommendation=match_report.get("recommendation", ""),
                caregiving_experience=match_caregiving_experience,
            ),
        ))

    # Sort by rank and re-assign ranks if needed
    results.sort(key=lambda r: r.score, reverse=True)
    for i, r in enumerate(results):
        r.rank = i + 1

    # Debug: Print final results before returning
    print(f"[DEBUG MATCH] Returning {len(results)} results")
    for r in results:
        print(f"  - {r.caregiver.name}: score={r.score}, rank={r.rank}, badge={r.match_badge}")

    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
