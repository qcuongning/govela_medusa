import { Logger } from "@medusajs/framework/types"
import {
  AbstractAuthModuleProvider,
  MedusaError,
  ModuleProvider,
  Modules,
} from "@medusajs/framework/utils"
import { getApp, getApps, initializeApp, cert, App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import path from "path"

console.log(`[Firebase Auth] Provider module file evaluated at ${__filename}`)

type InjectedDependencies = {
  logger: Logger
}

type FirebaseAuthOptions = {
  projectId?: string
  clientEmail?: string
  privateKey?: string
  serviceAccountJson?: string
}

class FirebaseAuthService extends AbstractAuthModuleProvider {
  static identifier = "firebase"
  static DISPLAY_NAME = "Firebase Authentication"

  protected logger_: Logger
  protected app_: App | null
  protected options_: FirebaseAuthOptions

  constructor({ logger }: InjectedDependencies, options: FirebaseAuthOptions) {
    // @ts-ignore
    super(...arguments)

    this.logger_ = logger
    this.options_ = options
    this.app_ = null
    
    this.logger_.info("[Firebase Auth] Provider service instantiated.")
  }

  async register(data: any, authIdentityService: any) {
    return this.authenticate(data, authIdentityService)
  }

  async update() {
    return {
      success: false,
      error: "Firebase auth provider does not support profile updates through Medusa.",
    }
  }

  async authenticate(req: any, authIdentityService: any) {
    const idToken = req.body?.id_token ?? req.body?.idToken

    if (!idToken) {
      return { success: false, error: "No Firebase ID token provided." }
    }

    try {
      const decoded = await getAuth(this.getFirebaseApp_()).verifyIdToken(idToken)

      if (decoded.email && decoded.email_verified === false) {
        return {
          success: false,
          error: "Firebase email must be verified before login.",
        }
      }

      const entityId = decoded.uid
      const userMetadata = {
        email: decoded.email ?? null,
        name: decoded.name ?? null,
        picture: decoded.picture ?? null,
        phone_number: decoded.phone_number ?? null,
      }

      let authIdentity

      try {
        authIdentity = await authIdentityService.retrieve({
          entity_id: entityId,
        })

        await authIdentityService.update(entityId, {
          user_metadata: userMetadata,
          provider_metadata: {
            firebase_uid: decoded.uid,
            sign_in_provider: decoded.firebase?.sign_in_provider ?? null,
          },
        })
      } catch (error: any) {
        if (error.type !== MedusaError.Types.NOT_FOUND) {
          return { success: false, error: error.message }
        }

        authIdentity = await authIdentityService.create({
          entity_id: entityId,
          user_metadata: userMetadata,
          provider_metadata: {
            firebase_uid: decoded.uid,
            sign_in_provider: decoded.firebase?.sign_in_provider ?? null,
          },
        })
      }

      return {
        success: true,
        authIdentity,
      }
    } catch (error: any) {
      this.logger_.error(`Firebase authentication failed: ${error.message}`)

      return {
        success: false,
        error: "Firebase authentication failed.",
      }
    }
  }

  private getFirebaseApp_() {
    if (this.app_) {
      return this.app_
    }

    this.app_ = this.initializeFirebaseApp_(this.options_)

    return this.app_
  }

  private initializeFirebaseApp_(options: FirebaseAuthOptions) {
    const existingApp = getApps().find((app) => app.name === "medusa-firebase")

    if (existingApp) {
      return getApp(existingApp.name)
    }

    const serviceAccountJson =
      options.serviceAccountJson || process.env.FIREBASE_SERVICE_ACCOUNT_JSON

    if (serviceAccountJson) {
      const credentials = JSON.parse(serviceAccountJson)

      return initializeApp(
        {
          credential: cert({
            projectId: credentials.project_id,
            clientEmail: credentials.client_email,
            privateKey: credentials.private_key,
          }),
        },
        "medusa-firebase"
      )
    }

    const projectId = options.projectId || process.env.FIREBASE_PROJECT_ID
    const clientEmail =
      options.clientEmail || process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = (
      options.privateKey || process.env.FIREBASE_PRIVATE_KEY || ""
    ).replace(/\\n/g, "\n")

    if (!projectId || !clientEmail || !privateKey) {
      this.logger_.error("[Firebase Auth] Missing required environment variables.", {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey
      })
      throw new Error(
        "Firebase auth provider requires FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
      )
    }

    return initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      "medusa-firebase"
    )
  }
}

export default ModuleProvider(Modules.AUTH, {
  services: [FirebaseAuthService],
})
