import os
import re

with open('src/components/operations/OperationsTab.tsx', 'r') as f:
    original_code = f.read()

main_return_idx = original_code.find('  return (\n    <div className="space-y-6" id="ops-module-root">')
before_return = original_code[:main_return_idx]
after_return = original_code[main_return_idx:]

with open('top_vars.txt', 'r') as f:
    top_vars = [line.strip().replace(',', '') for line in f.readlines()]

context_value_obj = "{\n    " + ",\n    ".join(top_vars) + "\n  }"

# Create OperationsContext.tsx
os.makedirs('src/components/operations/ui', exist_ok=True)
os.makedirs('src/components/operations/tables', exist_ok=True)

with open('src/components/operations/OperationsContext.tsx', 'w') as f:
    f.write("""import React, { createContext, useContext } from 'react';

export const OperationsContext = createContext<any>(null);

export const useOperations = () => useContext(OperationsContext);

export const OperationsProvider = ({ children, value }: { children: React.ReactNode, value: any }) => {
  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
};
""")

# Component template
def make_component(name, jsx_content):
    imports = """// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';

"""
    destructure = f"  const {{\n    " + ",\n    ".join(top_vars) + f"\n  }} = useOperations();\n"
    
    code = f"{imports}\nexport const {name} = () => {{\n{destructure}\n  return (\n    <>\n{jsx_content}\n    </>\n  );\n}};\n"
    return code

# We need to slice the JSX carefully.
lines = after_return.split('\n')

def get_slice(start_text, end_text):
    start_idx = -1
    end_idx = -1
    for i, l in enumerate(lines):
        if start_text in l and start_idx == -1:
            start_idx = i
        if end_text in l and start_idx != -1 and end_idx == -1:
            end_idx = i
            break
    if start_idx != -1 and end_idx != -1:
        return "\n".join(lines[start_idx:end_idx])
    return ""

def get_slice_lines(start_line, end_line):
    # Adjust for relative index: main_return_idx line is line 2019
    # Wait, it's easier to just use the original file lines!
    pass

