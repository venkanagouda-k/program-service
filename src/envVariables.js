
const envVariables = {
    baseURL: process.env.dock_base_url || 'http://dock.sunbirded.org',
    SUNBIRD_URL: process.env.sunbird_base_url || 'https://dev.sunbirded.org',
    SUNBIRD_PORTAL_API_AUTH_TOKEN: process.env.sunbird_api_auth_token,
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
