import re

with open('Aicodingchatbot .HTML', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Update HTML
old_html = r'<div class="welcome-icon" style="background: none; border: none; padding: 0;"><img src="/logo.png" style="width: 100%; height: 100%; object-fit: contain; border-radius: 18px;" alt="Logo"></div>'

new_html = """<div class="hero-logo-wrapper">
        <div class="welcome-icon">
          <img src="/logo.png" alt="CodeMind AI Logo">
        </div>
      </div>"""

if old_html in content:
    content = content.replace(old_html, new_html)
else:
    # Just in case the format changed slightly
    pattern = r'<div class="welcome-icon".*?</div>'
    content = re.sub(pattern, new_html, content, count=1)

# 2. Inject new CSS
new_css = """
  /* ─── PREMIUM HERO LOGO ─── */
  .hero-logo-wrapper {
    position: relative; width: 110px; height: 110px; margin: 0 auto 24px;
    display: flex; align-items: center; justify-content: center;
    animation: floatingLogo 6s ease-in-out infinite;
  }
  
  .hero-logo-wrapper::before {
    content: ''; position: absolute; width: 160%; height: 160%;
    background: radial-gradient(circle, rgba(0, 229, 255, 0.3) 0%, rgba(124, 58, 237, 0.15) 40%, transparent 70%);
    z-index: -1; border-radius: 50%; filter: blur(25px); opacity: 0.9;
    animation: pulseGlow 4s ease-in-out infinite alternate;
  }

  .welcome-icon {
    width: 90px; height: 90px; position: relative; border-radius: 26px;
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.08);
    border-top: 1px solid rgba(255,255,255,0.25);
    border-left: 1px solid rgba(255,255,255,0.15);
    box-shadow: 
      0 12px 32px rgba(0,0,0,0.5),
      0 8px 16px rgba(0, 229, 255, 0.1),
      inset 0 0 0 1px rgba(255,255,255,0.05),
      inset 0 2px 12px rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    z-index: 1; overflow: hidden; margin: 0;
  }

  .welcome-icon:hover {
    transform: translateY(-6px) scale(1.05);
    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%);
    box-shadow: 
      0 18px 40px rgba(0,0,0,0.6),
      0 12px 24px rgba(0, 229, 255, 0.25),
      inset 0 0 0 1px rgba(255,255,255,0.1),
      inset 0 2px 18px rgba(255,255,255,0.25);
    border-top: 1px solid rgba(255,255,255,0.4);
  }

  .welcome-icon img {
    width: 68%; height: 68%; object-fit: contain;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  .welcome-icon:hover img {
    transform: scale(1.15) rotate(-2deg);
    filter: drop-shadow(0 8px 16px rgba(0, 229, 255, 0.5));
  }

  @keyframes floatingLogo {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
  
  @keyframes pulseGlow {
    0% { opacity: 0.6; filter: blur(20px); transform: scale(0.95); }
    100% { opacity: 1; filter: blur(28px); transform: scale(1.05); }
  }
"""

# Remove old .welcome-icon CSS if it exists
css_pattern = r'\.welcome-icon\s*\{[^}]+\}'
if re.search(css_pattern, content):
    content = re.sub(css_pattern, '', content)

content = content.replace("</style>", new_css + "\n</style>")

with open('Aicodingchatbot .HTML', 'w', encoding='utf-8') as f:
    f.write(content)

print("Premium hero logo implemented.")
