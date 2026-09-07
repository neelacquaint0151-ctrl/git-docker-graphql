import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

import { userResolver } from '../graphql/resolvers/user.resolver.js';
import { postResolver } from '../graphql/resolvers/post.resolver.js';
import { createPostLoader } from '../dataloaders/post.loader.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const typeDefs = gql`
  type User {
    id: ID!
    name: String
    role: String
  }

  type DBUser {
    id: ID!
    name: String!
    email: String!
    posts: [DBPost!]!
  }

  type DBPost {
    id: ID!
    title: String!
    authorId: Int!
  }

  type Query {
    hello: String
    healthCheck: String
    getUser(id: ID!): User
    users: [DBUser!]!
  }

  type Mutation {
    updateUser(id: ID!, name: String, role: String): User
    createUser(name: String!, email: String!): DBUser!
    createPost(title: String!, authorId: Int!): DBPost!
  }
`;

const resolvers = {
  Query: { ...userResolver.Query },
  DBUser: { ...userResolver.DBUser },
  Mutation: { ...userResolver.Mutation, ...postResolver.Mutation },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

await server.start();

app.use(
  '/graphql',
  cors(),
  express.json(),
  expressMiddleware(server, {
    context: async () => ({ postLoader: createPostLoader() }),
  })
);

const PORT = process.env.USER_SERVICE_PORT || 4002;
httpServer.listen(PORT, () => console.log(`👤 User Subgraph ready at http://localhost:${PORT}/graphql`));