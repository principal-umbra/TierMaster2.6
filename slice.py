import sys

def slice_file(start_line, end_line, output_file):
    with open('src/components/operations/OperationsTab.tsx', 'r') as f:
        lines = f.readlines()
    
    with open(output_file, 'w') as f:
        f.writelines(lines[start_line-1:end_line])

slice_file(2045, 2178, 'header_raw.tsx')
