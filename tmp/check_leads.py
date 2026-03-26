import os

filepath = r"c:\Users\drumm\Downloads\wholescaleos-main (1)\src\store\useStore.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix deleteLead missing comma and brace issues
# The viewed code showed:
# 1879:       }).catch(() => {});
# 1880:     }
# 1881: 
# 1882:     // Trigger Notification

# Actually, the viewed code in step 3827 showed that deleteLead was okay?
# Let me re-verify the viewed code for deleteLead.
# Wait, let me check where deleteLead ends.

# Content to find for deleteLead (based on previous view)
# It seemed leadsService.remove(id) was what I thought was broken but view 3827 showed addLead?
# Ah, I see. In step 3793 I thought deleteLead was broken.
# Let me look at lines 1930-1960.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Check completed.")
