module.exports = function(grunt) {

    grunt.loadNpmTasks("grunt-release");

    grunt.initConfig({
        release: {
            options: {
                github: {
                    repo: "sebz/airvantage.js",
                    accessTokenVar: "GITHUB_ACCESS_TOKEN"
                }
            }
        }
    });
};
