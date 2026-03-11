import os

def check_comments(filepath):
    comment_lines = 0
    total_lines = 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        try:
            lines = f.readlines()
        except UnicodeDecodeError:
            return None
            
        total_lines = len(lines)
        if total_lines == 0:
            return None
            
        is_multiline_comment = False
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                total_lines -= 1 # adjust total lines to exclude empty lines
                continue
                
            if filepath.endswith('.py'):
                if is_multiline_comment:
                    comment_lines += 1
                    if stripped.endswith('"""') or stripped.endswith("'''"):
                        is_multiline_comment = False
                elif stripped.startswith('"""') or stripped.startswith("'''"):
                    comment_lines += 1
                    if not (stripped.endswith('"""') and len(stripped) > 3) and not (stripped.endswith("'''") and len(stripped) > 3):
                        is_multiline_comment = True
                elif stripped.startswith('#'):
                    comment_lines += 1
                    
            elif filepath.endswith(('.js', '.jsx')):
                if is_multiline_comment:
                    comment_lines += 1
                    if '*/' in stripped:
                        is_multiline_comment = False
                elif stripped.startswith('/*'):
                    comment_lines += 1
                    if '*/' not in stripped:
                        is_multiline_comment = True
                elif stripped.startswith('//'):
                    comment_lines += 1
                
    if total_lines == 0:
        return None
        
    return comment_lines, total_lines

def main():
    base_dir = r"f:\qualitative-tool-bkd"
    results = []
    
    for root, dirs, files in os.walk(base_dir):
        if 'node_modules' in root or '.git' in root or 'venv' in root or '__pycache__' in root:
            continue
            
        for file in files:
            if file.endswith(('.py', '.js', '.jsx')):
                filepath = os.path.join(root, file)
                stats = check_comments(filepath)
                if stats:
                    comments, total = stats
                    ratio = comments / total
                    if total > 10 and ratio < 0.1: # Less than 10% comments and more than 10 lines
                        results.append((filepath, comments, total, ratio))
                        
    results.sort(key=lambda x: x[3]) # Sort by lowest ratio
    
    print("Files with very low comment density (<10% comments):")
    for fp, c, t, r in results:
        # relative path
        rel_fp = os.path.relpath(fp, base_dir)
        print(f"{rel_fp}: {c} comment lines / {t} total lines ({r:.1%})")

if __name__ == "__main__":
    main()
