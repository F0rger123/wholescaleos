import { supabase } from './supabase';

export interface CustomField {
  id: string;
  team_id: string;
  name: string;
  field_key: string;
  field_type: 'text' | 'number';
  display_order: number;
  created_at: string;
}

export async function fetchCustomFields(teamId: string): Promise<CustomField[]> {
  console.log('🔍 Fetching custom fields for team:', teamId);
  
  if (!supabase) {
    console.error('❌ Supabase not configured');
    return [];
  }

  if (!teamId) {
    console.error('❌ No team ID provided');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('team_id', teamId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching custom fields:', error);
      return [];
    }

    console.log(`✅ Loaded ${data?.length || 0} custom fields`);
    return data || [];
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return [];
  }
}

export async function createCustomField(
  teamId: string, 
  field: { name: string; type: string }
): Promise<CustomField | null> {
  console.log('➕ Creating custom field:', { teamId, field });

  if (!supabase) {
    alert('❌ Supabase not configured - check your .env file');
    return null;
  }

  if (!teamId) {
    alert('❌ No team selected - please join or create a team first');
    return null;
  }

  const fieldKey = field.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  console.log('🔑 Generated field_key:', fieldKey);

  try {
    const { data, error } = await supabase
      .from('custom_fields')
      .insert([{
        team_id: teamId,
        name: field.name,
        field_key: fieldKey,
        field_type: field.type,
        display_order: 0
      }])
      .select();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      alert(`❌ Database error: ${error.message}`);
      return null;
    }

    console.log('✅ Field created:', data?.[0]);
    alert('✅ Field saved to database!');
    return data?.[0] || null;
  } catch (err: any) {
    console.error('❌ Unexpected error:', err);
    alert(`❌ Error: ${err.message}`);
    return null;
  }
}

export async function deleteCustomField(fieldId: string): Promise<boolean> {
  console.log('🗑️ Deleting custom field:', fieldId);

  if (!supabase) {
    alert('❌ Supabase not configured');
    return false;
  }

  try {
    const { error } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', fieldId);

    if (error) {
      console.error('❌ Error deleting field:', error);
      alert(`❌ Delete failed: ${error.message}`);
      return false;
    }

    console.log('✅ Field deleted');
    return true;
  } catch (err: any) {
    console.error('❌ Unexpected error:', err);
    alert(`❌ Error: ${err.message}`);
    return false;
  }
}