
const envVariables = {
    baseURL: process.env.BASE_URL || 'https://dev.sunbirded.org',
    port: process.env.service_port || 5000,
    level: process.env.service_log_level || 'info',
    config: {
        user: process.env.DB_user || "postgres",
        host: process.env.DB_host || "localhost",
        database: process.env.DB_database || 'sunbird_programs',
        password: process.env.DB_password || 'password',
        port: process.env.DB_port || 5432,
        dialect: process.env.DB_DIALECT || "postgres",
    }
}
module.exports = envVariables;
