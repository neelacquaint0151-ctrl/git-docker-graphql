import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

import { authResolver } from '../graphql/resolvers/auth.resolver.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const typeDefs = gql`
  type OTPResponse {
    success: Boolean!
    message: String!
  }

  type Mutation {
    sendOTP(phone: String!): OTPResponse!
    verifyOTP(phone: String!, code: String!): OTPResponse!
  }
`;

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers: authResolver }),
});

await server.start();
app.use('/graphql', cors(), express.json(), expressMiddleware(server));

const PORT = process.env.AUTH_SERVICE_PORT || 4001;
httpServer.listen(PORT, () => console.log(`🔒 Auth Subgraph ready at http://localhost:${PORT}/graphql`));