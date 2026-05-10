import re

files_to_update = ['Aicodingchatbot .HTML', 'login.html']

for file_path in files_to_update:
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Update the favicon href
        old_favicon = '<link rel="icon" type="image/png" href="/logo.png">'
        new_favicon = '<link rel="icon" type="image/png" href="/favicon.png">'

        if old_favicon in content:
            content = content.replace(old_favicon, new_favicon)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated favicon to favicon.png in {file_path}")
        else:
            print(f"Favicon link not found or already updated in {file_path}")
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
