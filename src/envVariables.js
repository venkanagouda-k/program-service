
const envVariables = {
    baseURL: process.env.sunbird_program_base_url || 'https://dev.sunbirded.org',
    port: process.env.sunbird_program_port || 6000,
    level: process.env.sunbird_service_log_level || 'info',
    config: {
        user: process.env.sunbird_program_db_user || "postgres",
        host: process.env.sunbird_program_db_host || "localhost",
        database: process.env.sunbird_program_db_name || 'sunbird_programs',
        password: process.env.sunbird_program_db_password || 'password',
        port: process.env.sunbird_program_db_port || 5432,
        dialect: process.env.sunbird_program_db_dialect || "postgres",
    }
}
module.exports = envVariables;
