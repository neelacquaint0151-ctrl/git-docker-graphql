import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { redis } from './config/redis.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// Centralized Redis-Backed Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
    }),
    message: { error: 'Too many requests from this IP, please try again later.' },
});

// Custom Data Source to forward auth context to subgraphs
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
    willSendRequest({ request, context }) {
        if (context.user) {
            request.http.headers.set('x-user-id', context.user.id || '');
            request.http.headers.set('x-user-role', context.user.role || 'user');
        }
    }
}

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

app.use('/graphql', cors(), express.json(), expressMiddleware(server, {
    context: async ({ req }) => {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token) return { user: null };

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            return { user: decoded };
        } catch (err) {
            console.warn('⚠️ Invalid or expired JWT token received at Gateway');
            return { user: null };
        }
    },
}));

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`🌐 Apollo Gateway running at http://localhost:${PORT}/graphql`));