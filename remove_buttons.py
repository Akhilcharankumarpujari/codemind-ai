import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

text_to_remove = """
      <button class="upload-btn" onclick="toggleRoadmapMode()" id="roadmapBtn" style="border-color:#10b981; color:#10b981; background:rgba(16,185,129,0.06); margin-top:8px">
        🗺️ DSA Roadmap
      </button>
      <button class="upload-btn" onclick="startMockInterview()" id="interviewBtn" style="border-color:#ef4444; color:#ef4444; background:rgba(239,68,68,0.06); margin-top:8px">
        💼 Mock Interview
      </button>"""

if text_to_remove in content:
    content = content.replace(text_to_remove, "")
    with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Buttons removed.")
else:
    print("Text not found exactly.")
