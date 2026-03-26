import os

filepath = r"c:\Users\drumm\Downloads\wholescaleos-main (1)\src\store\useStore.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix addTeamMember
# Look for the specific malformed pattern
old_add = """  addTeamMember: (member) =>
    get().saveToHistory();
    set((s) => ({ team: [...s.team, { ...member, id: uuidv4() }] })),"""

new_add = """  addTeamMember: (member) => {
    get().saveToHistory();
    set((s) => ({ team: [...s.team, { ...member, id: uuidv4() }] }));
  },"""

# Fix updateTask (missing ending brace for the action)
# Note: In the viewed file it looked like it had a closing brace but maybe trailing comma was wrong or something else
# Let's just ensure it's correct.

# Actually, let's do a more robust search and replace for the problematic lines
# addTeamMember fix
content = content.replace("  addTeamMember: (member) =>\n    get().saveToHistory();\n    set((s) => ({ team: [...s.team, { ...member, id: uuidv4() }] })),", new_add)

# If that failed due to \r\n vs \n
content = content.replace("  addTeamMember: (member) =>\r\n    get().saveToHistory();\r\n    set((s) => ({ team: [...s.team, { ...member, id: uuidv4() }] })),", new_add)

# updateTask fix (just in case)
content = content.replace("  updateTask: (id, updates) => {\n    get().saveToHistory();\n    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));\n    if (isSupabaseConfigured && supabase) {\n      const dbUp: Record<string, unknown> = {};\n      if (updates.title !== undefined) dbUp.title = updates.title;\n      if (updates.description !== undefined) dbUp.description = updates.description;\n      if (updates.status !== undefined) dbUp.status = updates.status;\n      if (updates.priority !== undefined) dbUp.priority = updates.priority;\n      if (updates.dueDate !== undefined) dbUp.due_date = updates.dueDate;\n      if (Object.keys(dbUp).length > 0) tasksService.update(id, dbUp).catch(() => {});\n    }\n  },", 
                         "  updateTask: (id, updates) => {\n    get().saveToHistory();\n    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));\n    if (isSupabaseConfigured && supabase) {\n      const dbUp: Record<string, unknown> = {};\n      if (updates.title !== undefined) dbUp.title = updates.title;\n      if (updates.description !== undefined) dbUp.description = updates.description;\n      if (updates.status !== undefined) dbUp.status = updates.status;\n      if (updates.priority !== undefined) dbUp.priority = updates.priority;\n      if (updates.dueDate !== undefined) dbUp.due_date = updates.dueDate;\n      if (Object.keys(dbUp).length > 0) tasksService.update(id, dbUp).catch(() => {});\n    }\n  },")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement attempted.")
