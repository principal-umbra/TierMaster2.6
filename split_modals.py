import os

with open('top_vars.txt', 'r') as f:
    top_vars = [line.strip().replace(',', '') for line in f.readlines()]

def make_modal(name, jsx_lines):
    imports = """// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';

"""
    destructure = f"  const {{\n    " + ",\n    ".join(top_vars) + f"\n  }} = useOperations();\n"
    
    code = f"{imports}\nexport const {name} = () => {{\n{destructure}\n  return (\n    <>\n{jsx_lines}\n    </>\n  );\n}};\n"
    return code

with open('src/components/operations/ui/OperationsModals.tsx', 'r') as f:
    modals_content = f.readlines()

slices_modals = [
    ('WeeklyScheduleModal', 180, 349),
    ('AgentDetailsDrawer', 351, 492),
    ('CheckinConfirmModal', 493, 579),
    ('TaskDetailModal', 580, 1367),
    ('ItemDetailModal', 1368, 1818)
]

os.makedirs('src/components/operations/modals', exist_ok=True)

for name, start, end in slices_modals:
    lines = "".join(modals_content[start-1:end])
    code = make_modal(name, lines)
    with open(f"src/components/operations/modals/{name}.tsx", 'w') as f:
        f.write(code)
    print(f"Created {name}.tsx")

