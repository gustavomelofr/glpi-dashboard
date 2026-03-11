const fs = require('fs');
const https = require('https');

const url = 'https://ywmgzbjhbgamjcqoebek.supabase.co/rest/v1/chamados_glpi?select=entidade&limit=10000';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bWd6YmpoYmdhbWpjcW9lYmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDY3ODEsImV4cCI6MjA4NzY4Mjc4MX0.-95leyrVniU37gB21pQV9BcKe2_qWQSkarOGpz7dHEI';

const options = {
    headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Accept': 'application/json'
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const tickets = JSON.parse(data);
            if (tickets.error) {
                console.error(tickets.error);
                return;
            }
            const locais = [...new Set(tickets.map(t => t.entidade).filter(Boolean))].sort();
            fs.writeFileSync('locais_output.txt', locais.join('\n'));
            console.log('Success - wrote to locais_output.txt');
        } catch (e) {
            console.error(e);
        }
    });
}).on('error', console.error);
