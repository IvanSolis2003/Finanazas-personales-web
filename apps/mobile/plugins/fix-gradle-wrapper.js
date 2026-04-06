const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function fixGradleWrapper(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle/wrapper/gradle-wrapper.properties'
      );
      if (fs.existsSync(wrapperPath)) {
        const content = fs.readFileSync(wrapperPath, 'utf8');
        const fixed = content.replace(
          /distributionUrl=.*gradle-.*\.zip/,
          'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.8-bin.zip'
        );
        fs.writeFileSync(wrapperPath, fixed);
        console.log('✓ Gradle wrapper fixed to 8.8');
      }
      return config;
    },
  ]);
};
