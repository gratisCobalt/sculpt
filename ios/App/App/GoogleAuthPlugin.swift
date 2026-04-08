import Foundation
import Capacitor
import GoogleSignIn

@objc(GoogleAuth)
public class GoogleAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GoogleAuth"
    public let jsName = "GoogleAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signOut", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refresh", returnType: CAPPluginReturnPromise),
    ]

    private var clientId: String?
    private var serverClientId: String?

    @objc func initialize(_ call: CAPPluginCall) {
        clientId = call.getString("clientId") ?? getConfig().getString("clientId")
        serverClientId = call.getString("serverClientId") ?? getConfig().getString("serverClientId")

        guard clientId != nil else {
            call.reject("No client ID provided")
            return
        }

        call.resolve()
    }

    @objc func signIn(_ call: CAPPluginCall) {
        guard let clientId = self.clientId else {
            call.reject("Google Auth not initialized — call initialize() first")
            return
        }

        guard let viewController = self.bridge?.viewController else {
            call.reject("No view controller available")
            return
        }

        DispatchQueue.main.async {
            let config = GIDConfiguration(clientID: clientId, serverClientID: self.serverClientId)
            GIDSignIn.sharedInstance.configuration = config

            GIDSignIn.sharedInstance.signIn(withPresenting: viewController) { result, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }

                guard let user = result?.user else {
                    call.reject("No user returned from Google Sign-In")
                    return
                }

                var userData: [String: Any] = [
                    "email": user.profile?.email ?? "",
                    "familyName": user.profile?.familyName ?? "",
                    "givenName": user.profile?.givenName ?? "",
                    "id": user.userID ?? "",
                    "name": user.profile?.name ?? "",
                ]

                if let imageUrl = user.profile?.imageURL(withDimension: 100)?.absoluteString {
                    userData["imageUrl"] = imageUrl
                }

                var authData: [String: Any] = [
                    "accessToken": user.accessToken.tokenString,
                ]

                if let idToken = user.idToken?.tokenString {
                    authData["idToken"] = idToken
                }

                if let serverAuthCode = result?.serverAuthCode {
                    userData["serverAuthCode"] = serverAuthCode
                }

                userData["authentication"] = authData
                call.resolve(userData)
            }
        }
    }

    @objc func refresh(_ call: CAPPluginCall) {
        guard let currentUser = GIDSignIn.sharedInstance.currentUser else {
            call.reject("User not logged in")
            return
        }

        currentUser.refreshTokensIfNeeded { user, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }

            guard let user = user else {
                call.reject("Failed to refresh tokens")
                return
            }

            call.resolve([
                "accessToken": user.accessToken.tokenString,
                "idToken": user.idToken?.tokenString ?? "",
            ])
        }
    }

    @objc func signOut(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            GIDSignIn.sharedInstance.signOut()
        }
        call.resolve()
    }
}
