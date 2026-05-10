import re

files_to_update = ['Aicodingchatbot .HTML', 'login.html']

for file_path in files_to_update:
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        favicon_tag = '<link rel="icon" type="image/png" href="/logo.png">\n'

        if favicon_tag not in content:
            content = content.replace("</head>", favicon_tag + "</head>")
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Added favicon to {file_path}")
        else:
            print(f"Favicon already exists in {file_path}")
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
