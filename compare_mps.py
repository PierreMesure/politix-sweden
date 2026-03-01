import json
import re

def normalize_name(name):
    return name.lower().strip()

def parse_html_name(html_name):
    match = re.search(r'([^,]+),\s+([^(]+)\s+\(([^)]+)\)', html_name)
    if match:
        lastname = match.group(1).strip()
        firstname = match.group(2).strip()
        party_code = match.group(3).strip()
        return f"{firstname} {lastname}", party_code
    return None, None

def main():
    with open('data/denmark/folketinget.json', 'r') as f:
        json_data = json.load(f)
    json_names = {normalize_name(mp['name']): mp for mp in json_data}
    
    with open('mp.html', 'r') as f:
        html_content = f.read()
    options = re.findall(r'<option[^>]*>([^<]+)</option>', html_content)
    
    html_mps = []
    for opt in options:
        name, party_code = parse_html_name(opt)
        if name:
            html_mps.append({'full_name': name, 'party_code': party_code, 'raw': opt})
    html_names = {normalize_name(mp['full_name']): mp for mp in html_mps}
    
    # Missing in JSON (present in HTML)
    missing_in_json = []
    for name_norm, mp in html_names.items():
        if name_norm not in json_names:
            missing_in_json.append(mp)
            
    # Extra in JSON (Missing in HTML)
    extra_in_json = []
    for name_norm, mp in json_names.items():
        if name_norm not in html_names:
            extra_in_json.append(mp)
            
    print(f"Total MPs in JSON: {len(json_data)}")
    print(f"Total MPs in HTML: {len(html_mps)}")
    
    print("\nMissing in JSON (present in HTML):")
    for mp in sorted(missing_in_json, key=lambda x: x['full_name']):
        print(f"- {mp['full_name']} ({mp['party_code']})")
        
    print("\nExtra in JSON (not present in HTML):")
    for mp in sorted(extra_in_json, key=lambda x: x['name']):
        print(f"- {mp['name']} ({mp['party']})")

if __name__ == "__main__":
    main()
