import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from "amazon-cognito-identity-js"

const ID_TOKEN_KEY = "idToken"
export const AUTH_TOKEN_EVENT = "auth-token-changed"

function notifyTokenChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_TOKEN_EVENT))
  }
}

let pool: CognitoUserPool | null = null

function getUserPool() {
  if (pool) return pool

  const UserPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
  const ClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID

  if (!UserPoolId || !ClientId) {
    throw new Error(
      "Missing NEXT_PUBLIC_COGNITO_USER_POOL_ID or NEXT_PUBLIC_COGNITO_CLIENT_ID env vars"
    )
  }

  pool = new CognitoUserPool({ UserPoolId, ClientId })
  return pool
}

export function login(email: string, password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: getUserPool(),
    })
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    })

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const idToken = session.getIdToken().getJwtToken()
        localStorage.setItem(ID_TOKEN_KEY, idToken)
        notifyTokenChanged()
        resolve(idToken)
      },
      onFailure: (err) => {
        reject(err instanceof Error ? err : new Error(String(err)))
      },
      newPasswordRequired: () => {
        reject(
          new Error(
            "NEW_PASSWORD_REQUIRED: tài khoản cần đặt lại mật khẩu trước khi đăng nhập"
          )
        )
      },
    })
  })
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ID_TOKEN_KEY)
}

export function logout() {
  if (typeof window === "undefined") return
  getUserPool().getCurrentUser()?.signOut()
  localStorage.removeItem(ID_TOKEN_KEY)
  notifyTokenChanged()
}
