import { Context, PreSignUpTriggerEvent } from 'aws-lambda';
import { lambdaHandler } from '../../app';
import { describe, it } from '@jest/globals';

describe('Unit test for app handler', function () {
    it('verifies successful response', async () => {
        const event: PreSignUpTriggerEvent = {
            "version": "1",
            "region": "us-east-1",
            "userPoolId": "us-east-1_7HPNLvT",
            "userName": "c8302f6d-4469-b31e-36ee6239e267",
            "callerContext": {
                "awsSdkVersion": "aws-sdk-unknown-unknown",
                "clientId": "741igvddli8mdl2v0bpsqc"
            },
            "triggerSource": "PreSignUp_SignUp",
            "request": {
                "userAttributes": {
                    "given_name": "Test",
                    "family_name": "User",
                    "email": "test@gmail.com"
                }
            },
            "response": {
                "autoConfirmUser": false,
                "autoVerifyEmail": false,
                "autoVerifyPhone": false
            }
        }

        await lambdaHandler(event, {} as unknown as Context, (err: any, result: any) => {})
    });
});
