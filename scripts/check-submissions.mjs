import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkSubmissions() {
  console.log('🔍 Checking submissions in database...\n');

  // Check all submissions
  const { data: allSubmissions, error: allError } = await supabase
    .from('arcindex_submissions')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (allError) {
    console.error('❌ Error fetching submissions:', allError);
    return;
  }

  console.log(`📊 Total submissions: ${allSubmissions?.length || 0}\n`);

  if (allSubmissions && allSubmissions.length > 0) {
    console.log('📋 Submissions by status:');
    const byStatus = allSubmissions.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    console.log(byStatus);
    console.log('\n📝 Recent submissions:');
    allSubmissions.slice(0, 5).forEach((s, i) => {
      console.log(`${i + 1}. ID: ${s.id}, Status: ${s.status}, Project ID: ${s.project_id}, Submitted: ${s.submitted_at}`);
    });
  } else {
    console.log('⚠️  No submissions found in database');
  }

  // Check projects with submissions
  const { data: projects, error: projectsError } = await supabase
    .from('arcindex_projects')
    .select('id, name, status, latest_submission_id')
    .in('status', ['Submitted', 'Approved', 'Rejected'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError);
    return;
  }

  console.log(`\n📊 Projects with status Submitted/Approved/Rejected: ${projects?.length || 0}`);
  if (projects && projects.length > 0) {
    console.log('\n📝 Recent projects:');
    projects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.status}) - Submission ID: ${p.latest_submission_id || 'none'}`);
    });
  }
}

checkSubmissions().catch(console.error);
