import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Gateway composes subgraphs into one schema
const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
        subgraphs: [
            { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql' },
            { name: 'user', url: process.env.USER_SERVICE_URL || 'http://localhost:4002/graphql' },
        ],
        pollIntervalInMs: 10000,
    }),
});

const server = new ApolloServer({ gateway });
await server.start();

app.use('/graphql', cors(), express.json(), expressMiddleware(server));

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`🌐 Apollo Gateway running at http://localhost:${PORT}/graphql`));