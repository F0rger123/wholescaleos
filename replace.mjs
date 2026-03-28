import fs from 'fs';
const file = 'src/store/useStore.ts';
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const startStr = '                  importLeadsFromData: (data) => {\n';
const endStr = '                    return imported;\n                  },';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const fullEndIndex = endIndex + endStr.length;
    
    // Slice out the old content
    const before = content.slice(0, startIndex);
    const after = content.slice(fullEndIndex);
    
    const replacement2 = `                  importLeadsFromData: async (data: any[]) => {
                    const state = get();
                    const now = new Date().toISOString();
                    let importedCount = 0;
                    let skippedCount = 0;
                    let mergedCount = 0;

                    const newLeads: Lead[] = [];
                    const mergedLeads: Lead[] = [];

                    for (const d of data) {
                      const leadName = (d.name || '').trim();
                      const leadEmail = (d.email || '').trim();
                      const leadPhone = (d.phone || '').trim();
                      const leadAddress = (d.propertyAddress || d.address || '').trim();
                      
                      if (!leadName && !leadAddress) {
                        skippedCount++;
                        continue;
                      }

                      let duplicateMatch: Lead | undefined;

                      if (state.duplicateSettings.enabled) {
                        duplicateMatch = state.leads.find((l: Lead) => {
                          return (
                            (state.duplicateSettings.matchFields.includes('email') && leadEmail && l.email === leadEmail) ||
                            (state.duplicateSettings.matchFields.includes('phone') && leadPhone && l.phone === leadPhone) ||
                            (state.duplicateSettings.matchFields.includes('address') && leadAddress && l.propertyAddress === leadAddress)
                          );
                        });

                        if (duplicateMatch) {
                          if (state.duplicateSettings.action === 'skip') {
                            skippedCount++;
                            continue;
                          } else if (state.duplicateSettings.action === 'merge') {
                            const mergedNotes = [duplicateMatch.notes, d.notes].filter(Boolean).join('\\n---\\nImport merge: ');
                            
                            const mergedLead: Lead = {
                              ...duplicateMatch,
                              name: leadName || duplicateMatch.name,
                              email: leadEmail || duplicateMatch.email,
                              phone: leadPhone || duplicateMatch.phone,
                              propertyAddress: leadAddress || duplicateMatch.propertyAddress,
                              propertyType: d.propertyType || duplicateMatch.propertyType,
                              estimatedValue: d.estimatedValue || d.value || duplicateMatch.estimatedValue,
                              bedrooms: d.bedrooms || duplicateMatch.bedrooms,
                              bathrooms: d.bathrooms || duplicateMatch.bathrooms,
                              sqft: d.sqft || duplicateMatch.sqft,
                              notes: mergedNotes,
                              updatedAt: now,
                            };
                            
                            mergedLeads.push(mergedLead);
                            mergedCount++;
                            continue;
                          }
                        }
                      }

                      const leadObj: Lead = {
                        id: uuidv4(),
                        name: leadName || 'Unknown',
                        email: leadEmail,
                        phone: leadPhone,
                        status: 'new',
                        source: (d.source as LeadSource) || 'other',
                        propertyAddress: leadAddress,
                        propertyType: d.propertyType || 'single-family',
                        estimatedValue: d.estimatedValue || d.value || 0,
                        bedrooms: d.bedrooms || 0,
                        bathrooms: d.bathrooms || 0,
                        sqft: d.sqft || 0,
                        offerAmount: 0,
                        lat: 30.2672,
                        lng: -97.7431,
                        notes: d.notes || '',
                        assignedTo: '',
                        createdAt: now,
                        updatedAt: now,
                        probability: 40,
                        engagementLevel: 2,
                        timelineUrgency: 3,
                        competitionLevel: 3,
                        importSource: d.importSource || 'import',
                        photos: d.photos || [],
                        documents: [],
                        timeline: [{
                          id: uuidv4(), type: 'note' as TimelineType,
                          content: \`Imported via bulk import.\${d.notes ? \` Notes: \${d.notes}\` : ''}\`,
                          timestamp: now, user: 'System',
                        }],
                        statusHistory: [{ fromStatus: null, toStatus: 'new', timestamp: now, changedBy: 'Import' }],
                      };
                      
                      newLeads.push(leadObj);
                      importedCount++;
                    }

                    set((s: any) => {
                      const mergedIds = new Set(mergedLeads.map(m => m.id));
                      const remainingLeads = s.leads.filter((l: Lead) => !mergedIds.has(l.id));
                      return { leads: [...remainingLeads, ...mergedLeads, ...newLeads] };
                    });

                    if (supabase && isSupabaseConfigured && get().teamId) {
                      const teamId = get().teamId;
                      
                      if (newLeads.length > 0) {
                        const newRows = newLeads.map(lead => ({
                          id: lead.id,
                          team_id: teamId,
                          name: lead.name,
                          email: lead.email,
                          phone: lead.phone,
                          address: lead.propertyAddress,
                          property_type: lead.propertyType,
                          property_value: lead.estimatedValue,
                          bedrooms: lead.bedrooms,
                          bathrooms: lead.bathrooms,
                          sqft: lead.sqft,
                          offer_amount: lead.offerAmount,
                          status: lead.status,
                          source: lead.source,
                          notes: lead.notes,
                          lat: lead.lat,
                          lng: lead.lng,
                          assigned_to: lead.assignedTo || null,
                          probability: lead.probability,
                          engagement_level: lead.engagementLevel,
                          timeline_urgency: lead.timelineUrgency,
                          competition_level: lead.competitionLevel,
                          import_source: lead.importSource || 'import',
                          photos: lead.photos || [],
                          created_at: lead.createdAt,
                          updated_at: lead.updatedAt,
                        }));

                        const { error } = await supabase.from('leads').insert(newRows);
                        if (error) console.error('❌ Failed to save new leads to Supabase:', error);
                      }
                      
                      if (mergedLeads.length > 0) {
                        for (const ml of mergedLeads) {
                          const { error } = await supabase.from('leads').update({
                            name: ml.name,
                            email: ml.email,
                            phone: ml.phone,
                            address: ml.propertyAddress,
                            property_type: ml.propertyType,
                            property_value: ml.estimatedValue,
                            bedrooms: ml.bedrooms,
                            bathrooms: ml.bathrooms,
                            sqft: ml.sqft,
                            notes: ml.notes,
                            updated_at: ml.updatedAt,
                          }).eq('id', ml.id);
                          
                          if (error) console.error(\`❌ Failed to update merged lead \${ml.id}:\`, error);
                        }
                      }
                    }

                    return { 
                      imported: importedCount + mergedCount, 
                      skipped: skippedCount, 
                      duplicates: mergedCount + (state.duplicateSettings.action === 'skip' ? skippedCount : 0) 
                    };
                  },`;
    
    fs.writeFileSync(file, before + replacement2 + after);
    console.log('Successfully replaced target 2');
} else {
    console.log('Could not find slice markers!');
    console.log('startIndex:', startIndex);
    console.log('endIndex:', endIndex);
}
