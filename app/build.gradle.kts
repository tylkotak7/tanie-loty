plugins { id("com.android.application") }
android {
    namespace = "pl.lotypoz"
    compileSdk = 35
    defaultConfig {
        applicationId = "pl.lotypoz"
        minSdk = 24
        targetSdk = 35
        versionCode = 5
        versionName = "1.4"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
