#!/usr/bin/env python3
"""
Sync Course Hubs for THIRTY@RPR (Randomized Unguessable Slugs)
Generates course hub pages using the exact proven roadmap.html architecture from MA101.
Strictly maps Claude-crafted dark background PDFs, question papers, and printables.
Hardlinks course files into portal/public/ so zero extra disk space is consumed on APFS.
Auto-updates plan.js with absolute paths under randomized unguessable slugs:
  - MA101: /c_3478648cd2d0271f
  - PH101: /c_67ee46a8023e0526
  - AI101: /c_60c79d2869539425
"""

import os
import sys
import shutil
import json
from pathlib import Path

BASE = Path("/Users/yatharthshrivastava/Documents/IIT AIDE")
PORTAL = BASE / "portal"
PUBLIC = PORTAL / "public"

PH_SRC = BASE / "PH101"
AI_SRC = BASE / "AI101"

HUBS_SLUG = "h_4c54e484817ae2cf"
MATH_SLUG = "c_3478648cd2d0271f"
PH_SLUG = "c_67ee46a8023e0526"
AI_SLUG = "c_60c79d2869539425"

MATH_DEST = PUBLIC / MATH_SLUG
PH_DEST = PUBLIC / PH_SLUG
AI_DEST = PUBLIC / AI_SLUG

def safe_link(src: Path, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        try:
            if os.path.samefile(src, dest):
                return
        except OSError:
            pass
        dest.unlink()
    try:
        os.link(src, dest)
    except OSError:
        shutil.copy2(src, dest)

# ── 1. SYNC PH101 FILES ──────────────────────────────────────────────────────

def sync_ph101():
    print(f"[*] Syncing PH101 Claude-crafted dark PDFs to /{PH_SLUG}...")
    PH_DEST.mkdir(parents=True, exist_ok=True)
    files_dir = PH_DEST / "files"
    files_dir.mkdir(parents=True, exist_ok=True)

    mappings = [
        # Endsem Master Companion & Mocks
        ("Endsem/Companion/PH101_Endsem_Companion.pdf", "companion/PH101_Endsem_Companion.pdf"),
        ("Endsem/Companion/PH101_Endsem_Mocks.pdf", "companion/PH101_Endsem_Mocks.pdf"),
        # Endsem LaTeX Tutorial Solutions
        ("Endsem/tut6_latex/tut6_solutions.pdf", "tutorials/tut6_solutions.pdf"),
        ("Endsem/tut7_latex/tut7_solutions.pdf", "tutorials/tut7_solutions.pdf"),
        ("Endsem/tut8_latex/tut8_solutions.pdf", "tutorials/tut8_solutions.pdf"),
        ("Endsem/tut9_latex/tut9_solutions.pdf", "tutorials/tut9_solutions.pdf"),
        # Endsem LaTeX Assignment Solutions
        ("Endsem/assignment6_latex/assignment6_solutions.pdf", "assignments/assignment6_solutions.pdf"),
        ("Endsem/assignment7_latex/assignment7_solutions.pdf", "assignments/assignment7_solutions.pdf"),
        # Midsem Vector Calculus Notes
        ("Midsem/PH101_Vector_Calculus_Notes/notes.pdf", "midsem/Vector_Calculus_Notes.pdf"),
        # Midsem LaTeX Assignments (Full Worked Solutions)
        ("Midsem/assignment1_latex/assignment1_solutions.pdf", "midsem/assignments/assignment1_solutions.pdf"),
        ("Midsem/assignment2_latex/assignment2_solutions.pdf", "midsem/assignments/assignment2_solutions.pdf"),
        ("Midsem/zassignment3_latex/assignment3.pdf", "midsem/assignments/assignment3_solutions.pdf"),
        ("Midsem/assignment4_latex/assignment4.pdf", "midsem/assignments/assignment4_solutions.pdf"),
        ("Midsem/assignment5_latex/assignment5.pdf", "midsem/assignments/assignment5_solutions.pdf"),
    ]

    # Add Midsem Practice Sets A through U (21 sets)
    sets_dir = PH_SRC / "Midsem" / "midsem_practice_sets"
    for code in "ABCDEFGHIJKLMNOPQRSTU":
        p = sets_dir / f"Set{code}.pdf"
        if p.exists():
            mappings.append((f"Midsem/midsem_practice_sets/Set{code}.pdf", f"midsem/sets/Set{code}.pdf"))

    linked = 0
    for src_rel, dest_rel in mappings:
        s = PH_SRC / src_rel
        d = files_dir / dest_rel
        if s.exists():
            safe_link(s, d)
            linked += 1

    print(f"✔ PH101: {linked} Claude-crafted dark PDFs hardlinked successfully.")

# ── 2. SYNC AI101 FILES ──────────────────────────────────────────────────────

def sync_ai101():
    print(f"[*] Syncing AI101 Claude-crafted dark PDFs & printables to /{AI_SLUG}...")
    AI_DEST.mkdir(parents=True, exist_ok=True)
    files_dir = AI_DEST / "files"
    files_dir.mkdir(parents=True, exist_ok=True)

    mappings = [
        # Endsem Notes Master Book
        ("Endsem Notes/AI101_Endsem_Notes.pdf", "endsem/AI101_Endsem_Notes.pdf"),
        # Midsem Comprehensive Notes
        ("Midsem Notes/AI101-Midsem-Notes.pdf", "midsem/AI101-Midsem-Notes.pdf"),
        # Midsem Papers (Dark and Printable pairs)
        ("Midsem Question Papers/SetA.pdf", "midsem/papers/SetA.pdf"),
        ("Midsem Question Papers/SetA-print.pdf", "midsem/papers/SetA-print.pdf"),
        ("Midsem Question Papers/SetB.pdf", "midsem/papers/SetB.pdf"),
        ("Midsem Question Papers/SetB-print.pdf", "midsem/papers/SetB-print.pdf"),
        ("Midsem Question Papers/SetC.pdf", "midsem/papers/SetC.pdf"),
        ("Midsem Question Papers/SetC-print.pdf", "midsem/papers/SetC-print.pdf"),
        ("Midsem Question Papers/SetD.pdf", "midsem/papers/SetD.pdf"),
        ("Midsem Question Papers/SetD-print.pdf", "midsem/papers/SetD-print.pdf"),
        # Quiz 2 Materials (Dark LaTeX)
        ("Quiz 2/Quiz2_Interleaved_Notes.pdf", "quiz2/Quiz2_Interleaved_Notes.pdf"),
        ("Quiz 2/Quiz2_Model_Exam.pdf", "quiz2/Quiz2_Model_Exam.pdf"),
        ("Quiz 2/Quiz2_Module3_Practice.pdf", "quiz2/Quiz2_Module3_Practice.pdf"),
        # Python Lab Solutions (LaTeX/Dark-crafted)
        ("lab/CDPP6/CDPP6_Solutions.pdf", "labs/CDPP6_Solutions.pdf"),
        ("lab/CPractice6/CPractice6_Solutions.pdf", "labs/CPractice6_Solutions.pdf"),
        ("lab/PrePractice7/PrePractice7_Solutions.pdf", "labs/PrePractice7_Solutions.pdf"),
    ]

    linked = 0
    for src_rel, dest_rel in mappings:
        s = AI_SRC / src_rel
        d = files_dir / dest_rel
        if s.exists():
            safe_link(s, d)
            linked += 1

    print(f"✔ AI101: {linked} Claude-crafted dark PDFs & printables hardlinked successfully.")

# ── 3. GENERATE PLAN.JS FOR PH101 ────────────────────────────────────────────

def generate_ph101_plan():
    plan = [
        ["Part I — Endsem Mastery (Companion, Mocks & LaTeX Solutions)", "I", [
            ["P00 · MASTER — Endsem Master Book & Mocks",
             "Complete first-principles derivations, 38 vector figures, cue notes, 200 graded problems, and 3-hour mocks anchored on Prof. Gagan Kumar's syllabus.", [
                ["P00-COMP-01-BK", "PH101 Endsem Companion (11 Chapters, Complete)", [["companion", f"/{PH_SLUG}/files/companion/PH101_Endsem_Companion.pdf"]], "Every derivation, cue note, and past paper question worked out in dark theme.", 20.0],
                ["P00-MOCK-01-EX", "PH101 Endsem Mock Examination 1 & 2 (Worked Solutions)", [["mocks 1 & 2", f"/{PH_SLUG}/files/companion/PH101_Endsem_Mocks.pdf"]], "Exact 3h exam format covering electrodynamics and optics.", 6.0],
                ["P00-MOCK-02-EX", "PH101 Endsem Mock Examination 3 (Future)", [["mock 3", f"/{PH_SLUG}/files/companion/PH101_Endsem_Mock3.pdf"]], "Will light up automatically when compiled.", 3.0],
            ]],
            ["P01 · TUT — Endsem Tutorial LaTeX Solutions",
             "Departmental tutorial sheets with full step-by-step mathematical proofs and solutions typeset in LaTeX dark theme.", [
                ["P01-TUT-06-TU", "Tutorial 6 Solutions: Magnetostatics, Biot-Savart & Vector Potential", [["solutions", f"/{PH_SLUG}/files/tutorials/tut6_solutions.pdf"]], "Full worked solutions for all Tutorial 6 questions.", 2.5],
                ["P01-TUT-07-TU", "Tutorial 7 Solutions: Ampère's Law, Dipoles & Bound Currents", [["solutions", f"/{PH_SLUG}/files/tutorials/tut7_solutions.pdf"]], "Full worked solutions for all Tutorial 7 questions.", 2.5],
                ["P01-TUT-08-TU", "Tutorial 8 Solutions: Faraday's Law, Inductance & Magnetic Energy", [["solutions", f"/{PH_SLUG}/files/tutorials/tut8_solutions.pdf"]], "Full worked solutions for all Tutorial 8 questions.", 2.5],
                ["P01-TUT-09-TU", "Tutorial 9 Solutions: Maxwell's Equations, Displacement Current & EM Waves", [["solutions", f"/{PH_SLUG}/files/tutorials/tut9_solutions.pdf"]], "Full worked solutions for all Tutorial 9 questions.", 2.5],
                ["P01-TUT-10-TU", "Tutorial 10 Solutions: Wave Superposition, Coherence & Interference", [["solutions", f"/{PH_SLUG}/files/tutorials/tut10_solutions.pdf"]], "Pending official release · will auto-activate once written.", 2.5],
            ]],
            ["P02 · ASG — Endsem Assignment LaTeX Solutions",
             "Rigorous LaTeX solutions to endsem homework assignments with explicit boundary condition analysis and coordinate tracking.", [
                ["P02-ASG-06-AS", "Assignment 6 Solutions: Magnetic Fields, Vector Potential & Inductance", [["solutions", f"/{PH_SLUG}/files/assignments/assignment6_solutions.pdf"]], "Rigorous solutions to Assignment 6.", 3.0],
                ["P02-ASG-07-AS", "Assignment 7 Solutions: Maxwell's Equations, Poynting Vector & Free Space Waves", [["solutions", f"/{PH_SLUG}/files/assignments/assignment7_solutions.pdf"]], "Rigorous solutions to Assignment 7.", 3.0],
                ["P02-ASG-08-AS", "Assignment 8 Solutions: Dispersion, Wave Packets & Interference", [["solutions", f"/{PH_SLUG}/files/assignments/assignment8_solutions.pdf"]], "Pending release · will auto-activate once written.", 3.0],
            ]],
        ]],
        ["Part II — Midsem Foundations & Practice Sets A–U", "II", [
            ["P51 · MIDVEC — Vector Calculus Master Notes",
             "Vector algebra, differential operators (grad, div, curl), curvilinear coordinates, and integral theorems.", [
                ["P51-VEC-01-BK", "PH101 Vector Calculus Master Notes", [["notes", f"/{PH_SLUG}/files/midsem/Vector_Calculus_Notes.pdf"]], "Comprehensive notes covering the mathematical backbone of PH101.", 4.0],
            ]],
            ["P52 · MIDASG — Midsem Assignment LaTeX Solutions",
             "Complete worked solutions to Assignments 1 through 5 in LaTeX dark theme.", [
                ["P52-ASG-01-AS", "Assignment 1 Solutions: Curvilinear Coordinates & Vector Fields", [["solutions", f"/{PH_SLUG}/files/midsem/assignments/assignment1_solutions.pdf"]], "", 2.0],
                ["P52-ASG-02-AS", "Assignment 2 Solutions: Gradient, Divergence, Curl & Dirac Delta", [["solutions", f"/{PH_SLUG}/files/midsem/assignments/assignment2_solutions.pdf"]], "", 2.0],
                ["P52-ASG-03-AS", "Assignment 3 Solutions: Line, Surface, Volume Integrals & Flux", [["solutions", f"/{PH_SLUG}/files/midsem/assignments/assignment3_solutions.pdf"]], "", 2.0],
                ["P52-ASG-04-AS", "Assignment 4 Solutions: Gauss's Law, Divergence Theorem & Potential", [["solutions", f"/{PH_SLUG}/files/midsem/assignments/assignment4_solutions.pdf"]], "", 2.0],
                ["P52-ASG-05-AS", "Assignment 5 Solutions: Stokes' Theorem, Work Done & Conservative Fields", [["solutions", f"/{PH_SLUG}/files/midsem/assignments/assignment5_solutions.pdf"]], "", 2.0],
            ]],
            ["P53 · SETS — Midsem Crucible Practice Sets (Sets A–U)",
             "21 custom Claude-typeset crucible practice problem sets (A through U) targeting every exam nuance in dark theme.", [
                ["P53-SET-A-PS", "Crucible Practice Set A (40 marks)", [["Set A", f"/{PH_SLUG}/files/midsem/sets/SetA.pdf"]], "Hardest of the series, drawing on advanced multi-topic problems.", 1.5],
                ["P53-SET-B-PS", "Crucible Practice Set B (40 marks)", [["Set B", f"/{PH_SLUG}/files/midsem/sets/SetB.pdf"]], "High-yield vector identities and curvilinear transformations.", 1.5],
                ["P53-SET-C-PS", "Crucible Practice Set C (40 marks)", [["Set C", f"/{PH_SLUG}/files/midsem/sets/SetC.pdf"]], "Differential operations and flux evaluations.", 1.5],
                ["P53-SET-D-PS", "Crucible Practice Set D (40 marks)", [["Set D", f"/{PH_SLUG}/files/midsem/sets/SetD.pdf"]], "Spherical and cylindrical coordinate applications.", 1.5],
                ["P53-SET-E-PS", "Crucible Practice Set E (40 marks)", [["Set E", f"/{PH_SLUG}/files/midsem/sets/SetE.pdf"]], "Integral theorems: Stokes and Divergence.", 1.5],
                ["P53-SET-F-PS", "Crucible Practice Set F (40 marks)", [["Set F", f"/{PH_SLUG}/files/midsem/sets/SetF.pdf"]], "Laplacian and Poisson equation scenarios.", 1.5],
                ["P53-SET-G-PS", "Crucible Practice Set G (40 marks)", [["Set G", f"/{PH_SLUG}/files/midsem/sets/SetG.pdf"]], "Electrostatic boundary conditions.", 1.5],
                ["P53-SET-H-PS", "Crucible Practice Set H (40 marks)", [["Set H", f"/{PH_SLUG}/files/midsem/sets/SetH.pdf"]], "Conductors and method of images drill.", 1.5],
                ["P53-SET-I-PS", "Crucible Practice Set I (40 marks)", [["Set I", f"/{PH_SLUG}/files/midsem/sets/SetI.pdf"]], "Capacitance and energy in electrostatic fields.", 1.5],
                ["P53-SET-J-PS", "Crucible Practice Set J (40 marks)", [["Set J", f"/{PH_SLUG}/files/midsem/sets/SetJ.pdf"]], "Dielectrics and polarization vectors.", 1.5],
                ["P53-SET-K-PS", "Crucible Practice Set K (40 marks)", [["Set K", f"/{PH_SLUG}/files/midsem/sets/SetK.pdf"]], "Steady currents and continuity equation.", 1.5],
                ["P53-SET-L-PS", "Crucible Practice Set L (40 marks)", [["Set L", f"/{PH_SLUG}/files/midsem/sets/SetL.pdf"]], "Biot-Savart law for wires, sheets and solenoids.", 1.5],
                ["P53-SET-M-PS", "Crucible Practice Set M (40 marks)", [["Set M", f"/{PH_SLUG}/files/midsem/sets/SetM.pdf"]], "Ampère's circuital law and symmetry drills.", 1.5],
                ["P53-SET-N-PS", "Crucible Practice Set N (40 marks)", [["Set N", f"/{PH_SLUG}/files/midsem/sets/SetN.pdf"]], "Magnetic vector potential Coulomb gauge.", 1.5],
                ["P53-SET-O-PS", "Crucible Practice Set O (40 marks)", [["Set O", f"/{PH_SLUG}/files/midsem/sets/SetO.pdf"]], "Magnetic dipole moment and non-uniform torques.", 1.5],
                ["P53-SET-P-PS", "Crucible Practice Set P (40 marks)", [["Set P", f"/{PH_SLUG}/files/midsem/sets/SetP.pdf"]], "Magnetic materials and bound current densities.", 1.5],
                ["P53-SET-Q-PS", "Crucible Practice Set Q (40 marks)", [["Set Q", f"/{PH_SLUG}/files/midsem/sets/SetQ.pdf"]], "Faraday's law and Lenz's law dynamics.", 1.5],
                ["P53-SET-R-PS", "Crucible Practice Set R (40 marks)", [["Set R", f"/{PH_SLUG}/files/midsem/sets/SetR.pdf"]], "Mutual and self-inductance derivations.", 1.5],
                ["P53-SET-S-PS", "Crucible Practice Set S (40 marks)", [["Set S", f"/{PH_SLUG}/files/midsem/sets/SetS.pdf"]], "Energy stored in magnetic fields.", 1.5],
                ["P53-SET-T-PS", "Crucible Practice Set T (40 marks)", [["Set T", f"/{PH_SLUG}/files/midsem/sets/SetT.pdf"]], "Displacement current and Maxwell corrections.", 1.5],
                ["P53-SET-U-PS", "Crucible Practice Set U (40 marks)", [["Set U", f"/{PH_SLUG}/files/midsem/sets/SetU.pdf"]], "Comprehensive midsem grand synthesis drill.", 2.0],
            ]],
        ]],
    ]

    out_file = PH_DEST / "plan.js"
    out_file.write_text("const PLAN = " + json.dumps(plan, indent=1) + ";\n")
    print(f"✔ Generated PH101 plan.js ({len(plan)} parts with absolute paths).")

# ── 4. GENERATE PLAN.JS FOR AI101 ────────────────────────────────────────────

def generate_ai101_plan():
    plan = [
        ["Part I — Quiz 3 & Endsem Core (Master Notes, ML, Ethics & Scikit-Learn Labs)", "I", [
            ["A00 · MASTER — Endsem Master Book & Mocks",
             "Complete course syllabus: Math for AI (Linear Algebra, Multivariable Calculus, Probability & Stats), Machine Learning algorithms, and DPDP Act 2023.", [
                ["A00-NOTE-01-BK", "AI101 Endsem Notes (15 Chapters, Comprehensive Master Book)", [["endsem notes", f"/{AI_SLUG}/files/endsem/AI101_Endsem_Notes.pdf"]], "Every mathematical proof, algorithm step, gradient derivation, and case study worked out in dark theme.", 25.0],
                ["A00-MOCK-01-EX", "AI101 Endsem Model Examination (Future)", [["model exam", f"/{AI_SLUG}/files/endsem/Endsem_Model_Exam.pdf"]], "Will auto-activate once compiled.", 3.0],
            ]],
            ["A01 · MLCORE — Module 4: Machine Learning Core & Scikit-Learn",
             "Supervised & unsupervised learning: linear & logistic regression, SVM, KNN, decision trees, K-means, and regularization.", [
                ["A01-LAB-07-LB", "PrePractice 7 Solutions: Scikit-Learn ML Models (Regression, SVM, KNN)", [["solutions", f"/{AI_SLUG}/files/labs/PrePractice7_Solutions.pdf"]], "Model training, hyperparameter tuning, evaluation metrics, and decision boundaries.", 3.5],
                ["A01-LAB-08-LB", "CDPP 7 Solutions: Advanced Classification & Clustering (Future)", [["solutions", f"/{AI_SLUG}/files/labs/CDPP7_Solutions.pdf"]], "Will auto-activate once written.", 3.0],
            ]],
            ["A02 · DATA-LABS — Python Data Foundations (NumPy, Pandas & Visualization)",
             "Claude-crafted dark-themed full solutions to Python laboratory exercises (NumPy, Pandas, Matplotlib, Seaborn).", [
                ["A02-LAB-06A-LB", "CDPP 6 Solutions: NumPy & Pandas Data Cleaning & Wrangling", [["solutions", f"/{AI_SLUG}/files/labs/CDPP6_Solutions.pdf"]], "Full worked code solutions with outputs and step-by-step explanations.", 3.0],
                ["A02-LAB-06B-LB", "CPractice 6 Solutions: Data Visualization with Matplotlib & Seaborn", [["solutions", f"/{AI_SLUG}/files/labs/CPractice6_Solutions.pdf"]], "Complete visualization exercises with high-res figures and code.", 2.5],
            ]],
        ]],
        ["Part II — Quiz 2 Syllabus Archive (Math for AI · Module 3)", "II", [
            ["A21 · QUIZ2 — Quiz 2 Mastery (Math for AI)",
             "Claude-typeset interleaved notes, practice questions, and full model exam covering Module 3 (Linear Algebra, Calculus, Vector derivatives, Eigenvalues/Eigenvectors).", [
                ["A21-QZ2-01-NT", "Quiz 2 Interleaved Notes (Module 3 Comprehensive)", [["interleaved notes", f"/{AI_SLUG}/files/quiz2/Quiz2_Interleaved_Notes.pdf"]], "Condensed, high-yield mathematical derivations and concepts.", 3.0],
                ["A21-QZ2-02-EX", "Quiz 2 Model Exam (Timed Paper & Detailed Solutions)", [["model exam", f"/{AI_SLUG}/files/quiz2/Quiz2_Model_Exam.pdf"]], "Timed examination paper replicating actual exam conditions.", 2.0],
                ["A21-QZ2-03-PS", "Quiz 2 Module 3 Practice Problems", [["practice problems", f"/{AI_SLUG}/files/quiz2/Quiz2_Module3_Practice.pdf"]], "Targeted drills on eigenvalues, eigenvectors, gradients, Hessians.", 2.5],
            ]],
        ]],
        ["Part III — Midsem Syllabus Archive (Foundations & Sets A–D Dark/Print)", "III", [
            ["A51 · MIDBOOK — Midsem Comprehensive Notes",
             "Rational agents, PEAS framework, search algorithms, tabular data cleaning, encoding, and exploratory analysis.", [
                ["A51-NOTE-01-BK", "AI101 Midsem Notes (Comprehensive Guide)", [["midsem notes", f"/{AI_SLUG}/files/midsem/AI101-Midsem-Notes.pdf"]], "Full pre-midsem curriculum in dark theme.", 6.0],
            ]],
            ["A52 · PAPERS — Midsem Question Papers (Dark Screen & Light Printable Pairs)",
             "Claude-typeset question papers for all four examination sets. Each set is available in Dark Theme (for reading on screens/tablets) and Print Theme (light background with zero ink waste for printing).", [
                ["A52-SET-A-EX", "Midsem Question Paper: Set A", [["Set A (dark)", f"/{AI_SLUG}/files/midsem/papers/SetA.pdf"], ["Set A (print)", f"/{AI_SLUG}/files/midsem/papers/SetA-print.pdf"]], "Flood rescue scenario, problem set A.", 2.0],
                ["A52-SET-B-EX", "Midsem Question Paper: Set B", [["Set B (dark)", f"/{AI_SLUG}/files/midsem/papers/SetB.pdf"], ["Set B (print)", f"/{AI_SLUG}/files/midsem/papers/SetB-print.pdf"]], "Flood rescue scenario, problem set B.", 2.0],
                ["A52-SET-C-EX", "Midsem Question Paper: Set C", [["Set C (dark)", f"/{AI_SLUG}/files/midsem/papers/SetC.pdf"], ["Set C (print)", f"/{AI_SLUG}/files/midsem/papers/SetC-print.pdf"]], "Flood rescue scenario, problem set C.", 2.0],
                ["A52-SET-D-EX", "Midsem Question Paper: Set D", [["Set D (dark)", f"/{AI_SLUG}/files/midsem/papers/SetD.pdf"], ["Set D (print)", f"/{AI_SLUG}/files/midsem/papers/SetD-print.pdf"]], "Flood rescue scenario, problem set D.", 2.0],
            ]],
        ]],
    ]

    out_file = AI_DEST / "plan.js"
    out_file.write_text("const PLAN = " + json.dumps(plan, indent=1) + ";\n")
    print(f"✔ Generated AI101 plan.js ({len(plan)} parts with absolute paths).")

# ── 5. GENERATE HTML PAGES (EXACT CLONES OF ROADMAP.HTML) ───────────────────

def replace_between(text, start_str, end_str, new_content):
    idx1 = text.find(start_str)
    if idx1 == -1:
        return text
    idx2 = text.find(end_str, idx1)
    if idx2 == -1:
        return text
    idx2 += len(end_str)
    return text[:idx1] + new_content + text[idx2:]

def generate_roadmap_clone(course_code, title, icon, tagline, description, legend_html, guidance_html, next_html, sources_html, plan_script, ls_key, active_course):
    # Read the golden roadmap.html from MA101
    math_index = (MATH_DEST / "index.html").read_text()

    # Replace Title
    html = math_index.replace("<title>MA101 Calculus</title>", f"<title>{course_code} {title}</title>")

    # Replace Header H1 and Subtitle
    new_h1_block = f'<h1><span class="logo">{icon}</span>{course_code} {title} <span class="tagline">{tagline}</span></h1>'
    html = replace_between(html, '<h1><span class="logo">', '</h1>', new_h1_block)

    # Replace Subtitle Paragraph
    html = replace_between(html, '<p class="sub">', '</p>', f'<p class="sub">{description}</p>')

    # Replace Legend
    html = replace_between(html, '<p class="legend">', '</p>', legend_html)

    # Replace Guidance Panel
    html = replace_between(html, '<details open>\n    <summary>How to work through a unit (read once)</summary>', '</details>', guidance_html)

    # Replace Coming Next
    html = replace_between(html, '<h2>Coming next</h2>', '</p>', next_html)

    # Replace Sources and Credits
    html = replace_between(html, '<details>\n    <summary>Sources and credits</summary>', '</details>', sources_html)

    # Remove MA101 migrations
    start_mig = html.find('// Codes were renumbered')
    end_mig = html.find('const save = () =>', start_mig)
    if start_mig != -1 and end_mig != -1:
        html = html[:start_mig] + html[end_mig:]

    # Replace Script Source
    html = html.replace(f'<script src="/{MATH_SLUG}/plan.js"></script>', f'<script src="{plan_script}"></script>')

    # Replace LocalStorage Keys
    html = html.replace('const LS = "ma101-roadmap-ticks"', f'const LS = "{ls_key}-roadmap-ticks"')
    html = html.replace('LS_W = "ma101-roadmap-left-width"', f'LS_W = "{ls_key}-roadmap-left-width"')
    html = html.replace('LS_S = "ma101-roadmap-scroll"', f'LS_S = "{ls_key}-roadmap-scroll"')
    html = html.replace('LS_SEEN = "ma101-roadmap-seen"', f'LS_SEEN = "{ls_key}-roadmap-seen"')
    html = html.replace('LS_FIT = "ma101-roadmap-fit"', f'LS_FIT = "{ls_key}-roadmap-fit"')
    html = html.replace('LS_OPEN = "ma101-roadmap-premidsem-open"', f'LS_OPEN = "{ls_key}-roadmap-premidsem-open"')

    # Replace navigation active pill styling
    if active_course == "ph101":
        html = html.replace(f'border:1px solid var(--accent); border-radius:6px; background:var(--tag); color:var(--accent); text-decoration:none;">MA101 Calculus</a>',
                            f'border:1px solid var(--line); border-radius:6px; background:var(--tag); color:var(--dim); text-decoration:none;">MA101 Calculus</a>')
        html = html.replace(f'border:1px solid var(--line); border-radius:6px; background:var(--tag); color:var(--dim); text-decoration:none;">PH101 Physics</a>',
                            f'border:1px solid var(--accent); border-radius:6px; background:var(--tag); color:var(--accent); text-decoration:none;">PH101 Physics</a>')
    elif active_course == "ai101":
        html = html.replace(f'border:1px solid var(--accent); border-radius:6px; background:var(--tag); color:var(--accent); text-decoration:none;">MA101 Calculus</a>',
                            f'border:1px solid var(--line); border-radius:6px; background:var(--tag); color:var(--dim); text-decoration:none;">MA101 Calculus</a>')
        html = html.replace(f'border:1px solid var(--line); border-radius:6px; background:var(--tag); color:var(--dim); text-decoration:none;">AI101 AI & DS</a>',
                            f'border:1px solid var(--accent); border-radius:6px; background:var(--tag); color:var(--accent); text-decoration:none;">AI101 AI & DS</a>')

    return html

def generate_html_pages():
    ph_legend = (
        '<p class="legend">Codename = <span class="code">P##-UNIT-NN-KIND</span>: unit number (study order) · unit mnemonic · position · kind.\n'
        '  <span class="code k-BK">BK</span>master companion ·\n'
        '  <span class="code k-EX">EX</span>exam &amp; 3h mocks ·\n'
        '  <span class="code k-TU">TU</span>tutorial solution ·\n'
        '  <span class="code k-AS">AS</span>assignment solution ·\n'
        '  <span class="code k-PS">PS</span>crucible practice set.\n'
        '  Hours are rough estimates for planning, not deadlines.</p>'
    )
    ph_guidance = (
        '<details open>\n'
        '    <summary>How to work through a unit (read once)</summary>\n'
        '    <div class="panel">\n'
        '      <ul>\n'
        '        <li><b>Target: Endsem Examination (16 November 2026, 35 marks):</b> Electrodynamics, wave physics, and optics: '
        'Faraday\'s Law, Inductance, Maxwell\'s Equations, Displacement Current, Poynting Vector, EM Wave Propagation, Wave Superposition, Coherence, and Interference Optics.</li>\n'
        '        <li><b>Pre-Midsem Foundations (Part II):</b> Vector calculus notes, assignments 1–5, and Crucible Practice Sets A through U '
        'are archived in the collapsed section below for reference and past-paper drills.</li>\n'
        '        <li><b>Master Companion (BK):</b> Study every step of the first-principles derivations and replicate the 38 vector figures with paper beside you.</li>\n'
        '        <li><b>Tutorials &amp; Assignments (TU, AS):</b> Every solution is written in dark LaTeX theme with explicit boundary tracking and coordinate checks.</li>\n'
        '        <li><b>Timed 3-Hour Mocks (EX):</b> Simulate actual exam conditions with full timed papers and compare against step-by-step worked solutions.</li>\n'
        '      </ul>\n'
        '    </div>\n'
        '  </details>'
    )
    ph_next = (
        '<h2>Coming next</h2>\n'
        '  <p class="sub">Prof. Gagan Kumar\'s lectures have reached electrodynamics and optics. '
        'Upcoming Tutorial 10 (wave superposition &amp; coherence) and Assignment 8 (dispersion &amp; interference) will be typeset into dark LaTeX editions '
        'and linked automatically as they are released.</p>'
    )
    ph_sources = (
        '<details>\n'
        '    <summary>Sources and credits</summary>\n'
        '    <div class="panel"><ul>\n'
        '      <li><b>PH101 Course Materials</b>: Prof. Gagan Kumar, Department of Physics, Indian Institute of Technology Ropar, first semester 2026–27.</li>\n'
        '      <li><b>Endsem Companion &amp; 3h Mocks</b>: Claude-crafted first-principles derivations, 38 vector diagrams, and complete exam solutions in dark theme.</li>\n'
        '      <li><b>Crucible Practice Sets (A–U)</b>: 21 comprehensive drill papers covering electrostatics, magnetostatics, and vector calculus.</li>\n'
        '      <li>PDFs are shown with <a href="https://mozilla.github.io/pdf.js/" target="_blank" rel="noopener">PDF.js</a> (Mozilla, Apache 2.0) where the browser cannot display them itself.</li>\n'
        '    </ul>\n'
        '    <p><button id="reset">Reset all ticks</button></p></div>\n'
        '  </details>'
    )

    ph_html = generate_roadmap_clone(
        course_code="PH101",
        title="Physics",
        icon="🧲",
        tagline="IIT Ropar · first semester 2026–27 · companion, mocks, tutorial & assignment solutions, practice sets",
        description="The PH101 engineering physics companion repository. Includes exclusively Claude-crafted dark background PDFs: the complete Endsem Companion (11 chapters, 38 vector figures), Endsem Mocks 1 & 2, step-by-step LaTeX Tutorial solutions (TUT 6–9), Assignment solutions (1–7), and Crucible Practice Sets A through U. All tasks are tracked in this browser.",
        legend_html=ph_legend,
        guidance_html=ph_guidance,
        next_html=ph_next,
        sources_html=ph_sources,
        plan_script=f"/{PH_SLUG}/plan.js",
        ls_key="ph101",
        active_course="ph101"
    )
    (PH_DEST / "index.html").write_text(ph_html)
    print(f"✔ Wrote portal/public/{PH_SLUG}/index.html (exact roadmap.html clone)")

    ai_legend = (
        '<p class="legend">Codename = <span class="code">A##-UNIT-NN-KIND</span>: unit number (study order) · unit mnemonic · position · kind.\n'
        '  <span class="code k-BK">BK</span>master notes book ·\n'
        '  <span class="code k-EX">EX</span>exam &amp; model papers ·\n'
        '  <span class="code k-NT">NT</span>interleaved notes ·\n'
        '  <span class="code k-LB">LB</span>Python laboratory solutions ·\n'
        '  <span class="code k-PS">PS</span>practice drills.\n'
        '  Hours are rough estimates for planning, not deadlines.</p>'
    )
    ai_guidance = (
        '<details open>\n'
        '    <summary>How to work through a unit (read once)</summary>\n'
        '    <div class="panel">\n'
        '      <ul>\n'
        '        <li><b>Target: Endsem Examination (16 November 2026, 35 marks) &amp; Quiz 3:</b> With Quiz 2 concluded (Module 3 Math for AI), '
        'primary cognitive focus is on Module 4 Machine Learning (Regression, Classification, SVM, KNN, Decision Trees, K-Means, Regularization, Optimization) '
        'and Module 5 AI Ethics &amp; DPDP Act 2023, along with Scikit-Learn Python laboratory exercises.</li>\n'
        '        <li><b>Pre-Quiz 2 (Module 3 Math for AI) and Midsem (Rational Agents, Search &amp; Sets A–D):</b> Archived in the collapsed '
        'sections below for quick review and past-paper drills.</li>\n'
        '        <li><b>Master Book (BK):</b> The 15-chapter master book synthesizes every mathematical proof, algorithm step, gradient derivation, '
        'and ethical framework from first principles.</li>\n'
        '        <li><b>Python Laboratory Solutions (LB):</b> Replicate data workflows with NumPy, Pandas, and Scikit-Learn; evaluate metrics and decision boundaries.</li>\n'
        '      </ul>\n'
        '    </div>\n'
        '  </details>'
    )
    ai_next = (
        '<h2>Coming next</h2>\n'
        '  <p class="sub">Advanced classification and clustering (CDPP 7), neural network foundations, and DPDP Act 2023 compliance case studies. '
        'Future model papers and laboratory solutions will automatically light up upon compilation.</p>'
    )
    ai_sources = (
        '<details>\n'
        '    <summary>Sources and credits</summary>\n'
        '    <div class="panel"><ul>\n'
        '      <li><b>AI101 Course Materials</b>: Department of Computer Science &amp; Engineering / AI &amp; Data Science, IIT Ropar, first semester 2026–27.</li>\n'
        '      <li><b>Endsem Master Book &amp; Midsem Notes</b>: Claude-crafted comprehensive curriculum notes with rigorous derivations and visual diagrams.</li>\n'
        '      <li><b>Midsem Question Papers</b>: Sets A–D typeset in both Screen Dark Theme and Zero-Ink White Print Theme.</li>\n'
        '      <li><b>Python Labs</b>: Fully verified code and LaTeX writeups for NumPy, Pandas, Matplotlib, and Scikit-Learn.</li>\n'
        '      <li>PDFs are shown with <a href="https://mozilla.github.io/pdf.js/" target="_blank" rel="noopener">PDF.js</a> (Mozilla, Apache 2.0) where the browser cannot display them itself.</li>\n'
        '    </ul>\n'
        '    <p><button id="reset">Reset all ticks</button></p></div>\n'
        '  </details>'
    )

    ai_html = generate_roadmap_clone(
        course_code="AI101",
        title="AI & DS",
        icon="🤖",
        tagline="IIT Ropar · first semester 2026–27 · endsem master notes, midsem papers, quiz 2, lab solutions",
        description="The AI101 Foundations of AI & Data Science companion repository. Includes exclusively Claude-crafted dark background PDFs: the complete Endsem Master Notes (15 chapters), Midsem Comprehensive Notes, Midsem Question Papers (Sets A–D in both Screen Dark Theme and Zero-Ink White Print Theme), Quiz 2 Interleaved Notes & Model Exam, and Python Lab worked solutions. All tasks are tracked in this browser.",
        legend_html=ai_legend,
        guidance_html=ai_guidance,
        next_html=ai_next,
        sources_html=ai_sources,
        plan_script=f"/{AI_SLUG}/plan.js",
        ls_key="ai101",
        active_course="ai101"
    )
    (AI_DEST / "index.html").write_text(ai_html)
    print(f"✔ Wrote portal/public/{AI_SLUG}/index.html (exact roadmap.html clone)")

def main():
    # Remove old guessable directories if they exist
    for old_dir in ["math", "ph101", "ai101", "hubs"]:
        d = PUBLIC / old_dir
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)
            print(f"✔ Purged old guessable directory: {d}")

    sync_ph101()
    sync_ai101()
    generate_ph101_plan()
    generate_ai101_plan()
    generate_html_pages()
    print("\n[ALL DONE] PH101 and AI101 are cloned from roadmap.html into randomized unguessable paths.")

if __name__ == "__main__":
    main()
