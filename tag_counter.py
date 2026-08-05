import re

with open('src/components/operations/ui/OperationsTareasTab.tsx', 'r') as f:
    content = f.read()

# Let's find the content of return (...) starting on line 178
idx = content.find('return (')
if idx != -1:
    sub = content[idx:]
    # Let's tokenise tags and braces
    # We want to trace <tag, </tag, {, }
    tokens = re.findall(r'(</?[a-zA-Z0-9\.]+|{|}|\(|(?<!-)\))', sub)
    
    tag_stack = []
    curly_stack = 0
    paren_stack = 0
    
    for tok in tokens:
        if tok == '{':
            curly_stack += 1
        elif tok == '}':
            curly_stack -= 1
        elif tok == '(':
            paren_stack += 1
        elif tok == ')':
            paren_stack -= 1
        elif tok.startswith('</'):
            tag = tok[2:]
            if tag_stack and tag_stack[-1] == tag:
                tag_stack.pop()
            else:
                print(f"Mismatched closing tag {tok}, current stack: {tag_stack}")
        elif tok.startswith('<') and not tok.startswith('<!--') and not tok.endswith('/'):
            # Check if self closing
            tag = tok[1:]
            tag_stack.append(tag)
            
    print("Tag Stack at end:", tag_stack)
    print("Curly Stack:", curly_stack)
    print("Paren Stack:", paren_stack)
