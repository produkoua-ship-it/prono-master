const https = require('https');

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Node' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function main() {
    const owner = 'produkoua-ship-it';
    const repo = 'prono-master';

    // Get last successful workflow runs
    const workflows = ['generate.yml', 'montante_robot.yml'];

    for (const wf of workflows) {
        console.log(`\n=== ${wf} ===`);
        try {
            const runsData = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${wf}/runs?status=success&per_page=1`);
            const runs = JSON.parse(runsData);

            if (!runs.workflow_runs || runs.workflow_runs.length === 0) {
                console.log("Aucun run réussi trouvé.");
                continue;
            }

            const run = runs.workflow_runs[0];
            console.log(`Run ID: ${run.id} | Date: ${run.created_at} | Conclusion: ${run.conclusion}`);

            // Fetch jobs for this run
            const jobsData = await fetch(run.jobs_url);
            const jobs = JSON.parse(jobsData);

            for (const job of jobs.jobs || []) {
                console.log(`\n  Job: ${job.name} (${job.conclusion})`);

                // Fetch logs for this job
                try {
                    const logs = await fetch(job.logs_url || `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${job.id}/logs`);
                    // Take last 50 lines
                    const lines = logs.split('\n').filter(l => l.trim()).slice(-50);
                    console.log(`  Dernières lignes de log:`);
                    lines.forEach(l => console.log(`    ${l}`));
                } catch (e) {
                    console.log(`  Logs non disponibles: ${e.message}`);
                }
            }
        } catch (e) {
            console.error(`Erreur: ${e.message}`);
        }
    }
}

main();