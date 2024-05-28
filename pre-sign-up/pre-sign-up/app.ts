import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider'
import {
  type Callback,
  type Context,
  type PreSignUpTriggerEvent
} from 'aws-lambda'
import { randomBytes } from 'crypto'

export async function lambdaHandler(
  event: PreSignUpTriggerEvent,
  context: Context,
  callback: Callback
): Promise<void> {
  try {
    const {
      region,
      triggerSource,
      userPoolId,
      userName,
      request: {
        userAttributes: { email, given_name: firstName, family_name: lastName }
      }
    } = event

    const SOCIAL_LOGIN = 'PreSignUp_ExternalProvider'

    if (triggerSource === SOCIAL_LOGIN) {
      const provider = new CognitoIdentityProvider({ region: region })

      // --> User has registered with Google/Facebook external providers
      const users = await provider.listUsers({
        UserPoolId: userPoolId,
        Filter: `email = "${email}"`
      })

      // userName example: "Facebook_12324325436" or "Google_1237823478"
      let [providerName, providerUserId] = userName.split('_')
      // Uppercase the first letter because the event sometimes
      // has it as google_1234 or facebook_1234. In the call to `adminLinkProviderForUser`
      // the provider name has to be Google or Facebook (first letter capitalized)
      providerName = (providerName.charAt(0).toUpperCase() + providerName.slice(1)).trim()
      providerUserId = providerUserId.trim()

      if (users?.Users != null && users.Users.length > 0) {
        // user already has cognito account
        const cognitoUsername = users.Users[0].Username ?? 'username-not-found'

        // if they have access to the Google / Facebook account of email X, verify their email.
        // even if their cognito native account is not verified
        await linkUser(
          provider,
          userPoolId,
          cognitoUsername,
          providerName,
          providerUserId
        )
        event.response.autoVerifyEmail = true
        event.response.autoConfirmUser = true
      } else {
        /* --> user does not have a cognito native account ->
            1. create a native cognito account
            2. change the password, to change status from FORCE_CHANGE_PASSWORD to CONFIRMED
            3. merge the social and the native accounts
            4. add the user to a group - OPTIONAL
        */

        const userAttributes = [
          {
            Name: 'email',
            Value: email
          },
          {
            Name: 'email_verified',
            Value: 'true'
          }
        ]

        if (firstName != null) {
          userAttributes.push({
            Name: 'given_name',
            Value: firstName
          })
        }

        if (lastName != null) {
          userAttributes.push({
            Name: 'family_name',
            Value: lastName
          })
        }

        const user = await provider.adminCreateUser({
          UserPoolId: userPoolId,
          Username: email,
          MessageAction: 'SUPPRESS',
          UserAttributes: userAttributes
        })

        await provider.adminSetUserPassword({
          UserPoolId: userPoolId,
          Username: email,
          Password: randomBytes(32).toString('hex'),
          Permanent: true
        })

        const cognitoUsername = user.User?.Username ?? 'username-not-found'

        await linkUser(
          provider,
          userPoolId,
          cognitoUsername,
          providerName,
          providerUserId
        )

        event.response.autoVerifyEmail = true
        event.response.autoConfirmUser = true
      }
    }

    callback(null, event)
  } catch (err) {
    callback(err as Error, event)
  }
}

async function linkUser(
  provider: CognitoIdentityProvider,
  userPoolId: string,
  cognitoUsername: string,
  providerName: string,
  providerUserId: string
): Promise<void> {
  await provider.adminLinkProviderForUser({
    UserPoolId: userPoolId,
    DestinationUser: {
      ProviderName: 'Cognito',
      ProviderAttributeValue: cognitoUsername
    },
    SourceUser: {
      ProviderName: providerName,
      ProviderAttributeName: 'Cognito_Subject',
      ProviderAttributeValue: providerUserId
    }
  })
}
