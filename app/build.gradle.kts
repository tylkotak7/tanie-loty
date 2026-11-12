plugins { id("com.android.application") }
android {
    namespace = "pl.lotypoz"
    compileSdk = 35
    defaultConfig {
        applicationId = "pl.lotypoz"
        minSdk = 24
        targetSdk = 35
        versionCode = 6
        versionName = "1.5"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
