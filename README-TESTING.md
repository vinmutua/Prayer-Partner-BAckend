# Testing the Prayer Partners API

This guide explains how to test the Prayer Partners API using the REST Client extension for VS Code.

## Prerequisites

1. Make sure the backend server is running:
   ```
   cd backend
   npx ts-node src/server.ts
   ```

2. Install the REST Client extension for VS Code:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "REST Client" by Huachao Mao
   - Click Install

## Running the Tests

1. Open the `api-tests.http` file in VS Code
2. You'll see multiple requests separated by `###`
3. Above each request, you'll see a "Send Request" link - click this to execute the request
4. The response will appear in a split window

## Test Sequence

For best results, run the tests in the following order:

1. **Authentication Tests**:
   - Login as Admin (1.1) - This will set the admin token for subsequent requests
   - Register a New User (1.2)
   - Login as Regular User (1.3) - This will set the user token for subsequent requests
   - Get Current User Profile (1.4)

2. **User Management Tests**:
   - Get All Users (2.1)

3. **Prayer Theme Tests**:
   - Get All Themes (3.1)
   - Create a New Theme (3.2) - This will set the theme ID for subsequent requests
   - Get a Specific Theme (3.3)

4. **Prayer Pairing Tests**:
   - Generate Prayer Pairings (4.1)
   - Get All Current Pairings (4.2)
   - Get Current Prayer Partner (4.3)
   - Get Prayer Partner History (4.4)
   - Export Pairings to CSV (4.5)

5. **Error Handling Tests**:
   - Login with Invalid Credentials (5.1) - Should return an error
   - Access Admin Endpoint as Regular User (5.2) - Should return an error
   - Access Protected Endpoint without Authentication (5.3) - Should return an error

## Troubleshooting

If you encounter issues:

1. **Server not running**: Make sure the backend server is running on port 3000
2. **Database issues**: Check your database connection in the `.env` file
3. **Authentication errors**: Make sure you've created an admin user with `npm run create-admin`
4. **Variable references**: If you see errors about variables not being defined, make sure you run the tests in sequence

## Notes

- The tests use variables to store values from previous responses (like tokens and IDs)
- You must run the tests in sequence for these variables to be properly set
- The `@adminToken` variable is set after the admin login request
- The `@userToken` variable is set after the user login request
- The `@themeId` variable is set after creating a new theme
