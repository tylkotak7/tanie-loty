plugins { id("com.android.application") }
android {
    namespace = "pl.lotypoz"
    compileSdk = 35
    defaultConfig {
        applicationId = "pl.lotypoz"
        minSdk = 24
        targetSdk = 35
        versionCode = 8
        versionName = "1.7"
    }
    // Stały klucz podpisu: bez niego każda wersja z GitHuba miała inny podpis
    // i Android nie pozwalał zainstalować aktualizacji na starą wersję.
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
