plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.digibiz.smsgateway"
    compileSdk = flutter.compileSdkVersion

    // Kotlin DSL සඳහා නිවැරදි කරන ලද signingConfigs
    signingConfigs {
        create("release") {
            storeFile = file("digibiz-key.jks")
            storePassword = "123456"
            keyPassword = "123456"
            keyAlias = "digibiz"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }

    defaultConfig {
        applicationId = "com.digibiz.smsgateway"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        getByName("release") {
            // මෙන්න මෙතනයි වෙනස තියෙන්නේ
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    implementation("com.google.firebase:firebase-database-ktx:21.0.0")
}