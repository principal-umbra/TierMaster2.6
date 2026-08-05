import os

with open('top_vars.txt', 'r') as f:
    top_vars = [line.strip().replace(',', '') for line in f.readlines()]

def make_component(name, jsx_lines):
    imports = """// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';
import { ActivityDrawer } from '../modals/ActivityDrawer';

"""
    destructure = f"  const {{\n    " + ",\n    ".join(top_vars) + f"\n  }} = useOperations();\n"
    
    code = f"{imports}\nexport const {name} = () => {{\n{destructure}\n  return (\n    <>\n{jsx_lines}\n    </>\n  );\n}};\n"
    return code

with open('src/components/operations/OperationsTab.tsx', 'r') as f:
    all_lines = f.readlines()

slices = [
    ('OperationsToast', 'ui', 2022, 2044),
    ('OperationsHeader', 'ui', 2045, 2178),
    ('OperationsFilterBar', 'ui', 2180, 2234),
    ('OperationsDashboardTab', 'ui', 2237, 2778),
    ('OperationsAdminTab', 'ui', 2780, 3612),
    ('OperationsAusenciasTab', 'ui', 3614, 3817),
    ('OperationsTareasTab', 'ui', 3819, 5034),
    ('OperationsCalendarioTab', 'ui', 5036, 5397),
    ('OperationsModals', 'ui', 5399, 7035)  # 7035 is the end of AnimatePresence before the final </div>
]

for name, folder, start, end in slices:
    lines = "".join(all_lines[start-1:end])
    code = make_component(name, lines)
    with open(f"src/components/operations/{folder}/{name}.tsx", 'w') as f:
        f.write(code)
    print(f"Created {name}.tsx")

