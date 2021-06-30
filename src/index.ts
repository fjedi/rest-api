/* eslint-disable lines-between-class-members  */
import isValidPort from 'validator/lib/isPort';
import http from 'http';
import { createHttpTerminator } from 'http-terminator';
import Koa, { Middleware, Next, ParameterizedContext, DefaultContext, DefaultState } from 'koa';
// Koa Router, for handling REST API requests
import KoaRouter, { IParamMiddleware } from 'koa-router';
// Enable cross-origin requests
import koaCors, { Options as KoaCORSOptions } from 'kcors';
import { CorsOptions as ExpressCORSOptions } from 'cors';
//
import bodyParser from 'koa-bodyparser';
// HTTP header hardening
import koaHelmet from 'koa-helmet';
// // Parse userAgent
// import UserAgent from 'useragent';
// // Cookies
import { SetOption } from 'cookies';
// @ts-ignore
import cookiesMiddleware from 'universal-cookie-koa';
// High-precision timing, so we can debug response time to serve a request
// @ts-ignore
import ms from 'microseconds';
import { get, pick, flattenDeep, merge, compact, map, trim } from 'lodash';
// Sentry
import * as Sentry from '@sentry/node';
import * as Integrations from '@sentry/integrations';
import git from 'git-rev-sync';
// Database
import {
  createConnection,
  initDatabase,
  InitDatabaseOptions,
  DatabaseConnection,
  DatabaseConnectionOptions,
  DatabaseModels,
  Sequelize,
  ValidationError,
  OptimisticLockError,
  DatabaseError,
  UniqueConstraintError,
} from '@fjedi/database-client';
import { redis, RedisClient } from '@fjedi/redis-client';
import { DefaultError } from '@fjedi/errors';
import { logger, Logger } from '@fjedi/logger';
import { decodeJWT } from '@fjedi/jwt';
// Socket.io
import { Socket, Server as WebsocketServer, ServerOptions } from 'socket.io';
import { createAdapter, RedisAdapter } from 'socket.io-redis';
import initWSEventEmitter from 'socket.io-emitter';
// @ts-ignore
import { Server as eiowsEngine } from 'eiows';
// Multi-lang support
import i18next, {
  TFunction,
  i18n,
  InitOptions as I18NextInitOptions,
  Resource as I18NextResource,
} from 'i18next';
// @ts-ignore
import i18nextBackend from 'i18next-sync-fs-backend';
//
import { uuid } from './helpers/uuid';
import { logServerStarted } from './helpers/console';
import { time, TimeConstructor } from './helpers/time';
import { BigNumber } from './helpers/numbers';
import * as transliterator from './helpers/transliterator';
import {
  setContextLang,
  detectContextLang,
  LANG_DETECTION_DEFAULT_OPTIONS,
  LANG_DETECTION_DEFAULT_ORDER,
} from './helpers/i18n';

export type RouteMethod = 'get' | 'post' | 'delete' | 'update' | 'put' | 'patch';
export type { Middleware, Next, ParameterizedContext, DefaultContext, DefaultState } from 'koa';
//
export * from './functions';
export * from './helpers/time';
export * from './helpers/numbers';
export * from './helpers/env';

// @ts-ignore
type TodoAny = any;

export type CORSOrigin = string | RegExp;

export type CORSOptions = {
  credentials: boolean;
  origin: CORSOrigin | CORSOrigin[];
};

export type KoaApp<TAppContext, TDatabaseModels extends DatabaseModels> = Koa & {
  context: RouteContext<TAppContext, TDatabaseModels>;
};

export type ContextHelpers = {
  time: TimeConstructor;
  uuid: typeof uuid;
  transliterator: typeof transliterator;
  BigNumber: typeof BigNumber;
  [k: string]: unknown;
};

export type ContextState = DefaultState & {
  ip: string;
  language: string;
  languageCode: string;
  countryCode?: string;
  userAgent?: string;
  authToken?: string;
  decodedAuthToken?: { sub: string; [k: string]: unknown };
};

export interface CookieOptions extends SetOption {
  cookieName?: string;
}

export type RouteContext<
  TAppContext,
  TDatabaseModels extends DatabaseModels,
> = ParameterizedContext<ContextState, DefaultContext> & {
  db: DatabaseConnection<TDatabaseModels>;
  redis: RedisClient;
  t?: TFunction;
  i18next?: i18n;
  language: string;
  logger: Logger;
  sentry?: typeof Sentry;
  helpers: ContextHelpers;
} & TAppContext;

export type RouteHandler<TAppContext, TDatabaseModels extends DatabaseModels> = (
  ctx: RouteContext<TAppContext, TDatabaseModels>,
  next?: Next,
) => TodoAny;

export type ErrorHandler<TAppContext, TDatabaseModels extends DatabaseModels> = (
  err: DefaultError | ValidationError | OptimisticLockError | DatabaseError | UniqueConstraintError,
  ctx: RouteContext<TAppContext, TDatabaseModels>,
) => void;

export type ExceptionHandlerProps = {
  cleanupFn: (exception?: Error) => Promise<void>;
  exit?: boolean;
  exitCode?: number;
};

export type RouteParam = {
  param: string;
  handler: IParamMiddleware;
};

export type Route<TAppContext, TDatabaseModels extends DatabaseModels> = {
  method: RouteMethod;
  route: string;
  handlers: RouteHandler<TAppContext, TDatabaseModels>[];
};

export type Translations = I18NextResource;

export type MultiLangOptions = I18NextInitOptions & {
  translations: Translations;
  backend: { addPath: string; loadPath: string };
  fallbackLng: string;
};

export type SentryOptions = Sentry.NodeOptions;
export type SentryError =
  | DefaultError
  | ValidationError
  | DatabaseError
  | UniqueConstraintError
  | Error;

export type SentryErrorProps = {
  messagePrefix?: string;
  request?: Request;
  response?: Response;
  path?: string;
  userId?: string | number;
  [k: string]: unknown;
};

export type ServerParams<
  TAppContext extends ParameterizedContext<ContextState, ParameterizedContext>,
  TDatabaseModels extends DatabaseModels,
> = {
  allowedOrigins?: string[];
  dbOptions: DatabaseConnectionOptions;
  bodyParserOptions?: bodyParser.Options;
  corsOptions?: KoaCORSOptions;
  routes?: Array<(server: Server<TAppContext, TDatabaseModels>) => void>;
  multiLangOptions?: MultiLangOptions;
  sentryOptions?: SentryOptions;
  contextHelpers?: Partial<ContextHelpers>;
};

export type StartServerParams = { beforeListen?: () => Promise<void> };

export type WSRequest = Socket['request'] & {
  headers: {
    cookie?: string;
    authorization?: string;
    ['user-agent']?: string;
  };
  clientRole?: string;
  client?: DatabaseModels[keyof DatabaseModels];
};

export type WSAuthCallback = (error: DefaultError | undefined, isAuthorized: boolean) => void;

export type WSSocketClient = Socket['client'] & {
  request: WSRequest;
};
export interface WSSocket extends Socket {
  client: WSSocketClient;
  request: WSRequest;
}

export type WSServerOptions = ServerOptions;

export class Server<
  TAppContext extends ParameterizedContext<ContextState, ParameterizedContext>,
  TDatabaseModels extends DatabaseModels,
> {
  environment: 'production' | 'development';
  host: string;
  port: number;
  allowedOrigins: Set<string>;
  koaApp: KoaApp<TAppContext, TDatabaseModels>;
  router: KoaRouter;
  routes: Set<Route<TAppContext, TDatabaseModels>>;
  routeParams: Set<RouteParam>;
  middleware: Set<Middleware<ContextState, RouteContext<TAppContext, TDatabaseModels>>>;
  beforeMiddleware: Set<Middleware<ContextState, RouteContext<TAppContext, TDatabaseModels>>>;
  koaAppFunc?: (app: Koa) => Promise<void>;
  handler404?: (ctx: RouteContext<TAppContext, TDatabaseModels>) => Promise<any>;
  errorHandler?: ErrorHandler<TAppContext, TDatabaseModels>;

  static SYSTEM_ERROR_REGEXP = /(Database|Sequelize|Fatal|MySQL|PostgreSQL|Uncaught|Unhandled)/gim;
  static DEFAULT_ERROR_MESSAGE =
    'The request failed, please try again later or contact technical support';

  // Middlewares
  // Enable body parsing by default.  Leave `koa-bodyparser` opts as default
  bodyParserOptions: bodyParser.Options;
  // CORS options for Koa and socket.io
  corsOptions: KoaCORSOptions;

  // Multi-lang support
  static LANG_DETECTION_DEFAULT_OPTIONS = LANG_DETECTION_DEFAULT_OPTIONS;
  static LANG_DETECTION_DEFAULT_ORDER = LANG_DETECTION_DEFAULT_ORDER;
  static DEFAULT_LANGUAGE = 'en';
  static detectContextLang = detectContextLang;
  static setContextLang = setContextLang;
  multiLangOptions?: MultiLangOptions;

  // Sentry
  sentryOptions?: SentryOptions;
  sentry?: typeof Sentry;

  // Database
  dbConnection: Sequelize;
  db?: DatabaseConnection<TDatabaseModels>;
  //
  logger: Logger;
  redis: RedisClient;

  //
  httpServer: http.Server;

  // Websockets
  ws?: WebsocketServer;
  wsEventEmitter?: initWSEventEmitter.SocketIOEmitter;

  constructor(params: ServerParams<TAppContext, TDatabaseModels>) {
    const {
      dbOptions,
      bodyParserOptions,
      corsOptions,
      routes,
      multiLangOptions,
      contextHelpers,
      sentryOptions,
      allowedOrigins,
    } = params;
    //
    if (allowedOrigins && (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0)) {
      const e = `Invalid "allowedOrigins" array`;
      throw new DefaultError(e, {
        meta: { corsOptions, allowedOrigins },
      });
    }
    //
    if (!allowedOrigins) {
      const ALLOWED_ORIGINS = map((process.env.ALLOWED_ORIGINS || '').split(','), trim);
      if (ALLOWED_ORIGINS.length === 0) {
        const e = `You must either provide "allowedOrigins" inside Server's constructor or set "ALLOWED_ORIGINS" env-variable`;
        throw new DefaultError(e);
      }
      if (process.env.HOST) {
        ALLOWED_ORIGINS.push(process.env.HOST);
      }
      this.allowedOrigins = new Set(ALLOWED_ORIGINS);
    } else {
      this.allowedOrigins = new Set(allowedOrigins);
    }
    //
    this.environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

    this.host = process.env.HOST || 'localhost';
    //
    if (typeof process.env.PORT !== 'undefined') {
      const { PORT } = process.env;
      if (!isValidPort(`${PORT}`)) {
        throw new TypeError(`${PORT} is not a valid port`);
      }
      this.port = parseInt(PORT, 10);
    } else {
      this.port = 5000;
    }
    //
    this.redis = redis;
    this.logger = logger;
    //
    this.dbConnection = createConnection(dbOptions);
    //
    this.bodyParserOptions = merge(
      { jsonLimit: '50mb', textLimit: '10mb' },
      bodyParserOptions || {},
    );
    //
    this.corsOptions = merge({ credentials: true }, corsOptions, {
      origin: (ctx: RouteContext<TAppContext, TDatabaseModels>) => {
        const origin = ctx.get('origin');
        if (this.allowedOrigins.has('*') || this.allowedOrigins.has(origin)) {
          return origin;
        }
        throw new Error('Request blocked due to CORS policy');
      },
    });
    //
    if (this.corsOptions.credentials && this.allowedOrigins.has('*')) {
      const e = `if corsOptions.credentials is "true", you must set non-empty "allowedOrigins" list that will not include "*" `;
      throw new DefaultError(e, {
        meta: { corsOptions: this.corsOptions, allowedOrigins: this.allowedOrigins },
      });
    }
    //
    if (sentryOptions) {
      if (!sentryOptions.dsn) {
        const e = `"dsn" is a required option to init Sentry middleware`;
        throw new DefaultError(e, {
          meta: sentryOptions,
        });
      }
      this.sentryOptions = merge(
        {
          debug: this.environment !== 'production',
          // None = 0, // No logs will be generated
          // Error = 1, // Only SDK internal errors will be logged
          // Debug = 2, // Information useful for debugging the SDK will be logged
          // Verbose = 3 // All SDK actions will be logged
          logLevel: this.environment === 'production' ? 1 : 3,
          // release: git.long(),
          environment: this.environment,
          serverName: this.host,
          sendDefaultPii: true,
          attachStacktrace: true,
          maxBreadcrumbs: 5,
          /*
            Configures the sample rate as a percentage of events
            to be sent in the range of 0.0 to 1.0. The default is
            1.0 which means that 100% of events are sent. If set
            to 0.1 only 10% of events will be sent. Events are
            picked randomly.
          */
          // sampleRate: 1,
          // ...
          integrations: [
            new Integrations.Dedupe(),
            new Integrations.Transaction(),
            new Integrations.ExtraErrorData({
              depth: 3,
            }),
          ],
        },
        sentryOptions,
      );
      //
      Sentry.init(this.sentryOptions);
      //
      Sentry.configureScope((scope) => {
        try {
          scope.setTag('git_commit', git.message());
          scope.setTag('git_branch', git.branch());
        } catch (e) {
          logger.warn('Failed to attach git info to the error sent to Sentry', e);
        }
      });
      //
      this.sentry = Sentry;
    }
    //
    if (multiLangOptions?.translations) {
      this.multiLangOptions = multiLangOptions;
      const { backend, translations } = multiLangOptions;
      ['backend.loadPath', 'backend.addPath', 'fallbackLng', 'translations'].forEach(
        (optionKey) => {
          const optionValue = get(multiLangOptions, optionKey);
          if (!optionValue) {
            const e = `"${optionKey}" is a required option to init multi-lang support`;
            throw new DefaultError(e, {
              meta: multiLangOptions,
            });
          }
        },
      );
      //
      const { loadPath, addPath } = multiLangOptions.backend;
      // Init multi-lang support
      i18next.use(i18nextBackend).init({
        // debug: true,
        // This is necessary for this sync version
        // of the backend to work:
        initImmediate: false,

        // preload: ['zh', 'en', 'ru', 'es'], // must know what languages to use
        preload: Object.keys(translations), // must know what languages to use
        load: 'languageOnly', // we only provide en, de -> no region specific locals like en-US, de-DE

        detection: {
          // order and from where user language should be detected
          order: ['path', 'querystring', 'cookie', 'session', 'header'],

          // keys or params to lookup language from
          lookupQuerystring: 'lang',
          lookupCookie: 'lang',
          lookupSession: 'lang',

          // cache user language on
          caches: ['cookie'],
        },
        ...multiLangOptions,
        backend: {
          ...backend,
          // translation resources
          loadPath: `${loadPath}/{{lng}}.json`,
          addPath: `${addPath}/{{lng}}.missing.json`,
        },
      });
    }

    // Init all API routes
    this.routes = new Set();
    //
    routes?.forEach((r: TodoAny) => this.initRoute(r));

    // Custom middleware
    this.beforeMiddleware = new Set();
    this.middleware = new Set();
    this.routeParams = new Set();

    // Build the router, based on our app's settings.  This will define which
    // Koa route handlers
    this.router = new KoaRouter()
      // Set-up a general purpose /ping route to check the server is alive
      .get('/ping', async (ctx) => {
        ctx.body = 'pong';
      })

      // Favicon.ico.  By default, we'll serve this as a 204 No Content.
      // If /favicon.ico is available as a static file, it'll try that first
      .get('/favicon.ico', async (ctx) => {
        ctx.status = 204;
      });

    // Build the app instance, which we'll use to define middleware for Koa
    // as a precursor to handling routes
    this.koaApp = new Koa()
      // Adds CORS config
      .use(koaCors(this.corsOptions))

      // Error wrapper.  If an error manages to slip through the middleware
      // chain, it will be caught and logged back here
      .use(async (ctx, next) => {
        const context = ctx as RouteContext<TAppContext, TDatabaseModels>;
        try {
          await next();
        } catch (e) {
          const isSystemError = !e.status || e.status >= 500;
          if (isSystemError) {
            this.logger.error(e);
          }
          //
          if (Sentry && typeof Sentry.captureException === 'function' && isSystemError) {
            Sentry.captureException(e);
          }
          // If we have a custom error handler, use that - else simply log a
          // message and return one to the user
          if (typeof this.errorHandler === 'function') {
            this.errorHandler(e, context);
          } else {
            ctx.body = this.environment === 'production' ? Server.DEFAULT_ERROR_MESSAGE : e.message;
            ctx.status = e.status || 500;
          }
        }
      }) as KoaApp<TAppContext, TDatabaseModels>;

    // eslint-disable-next-line no-param-reassign
    this.koaApp.context.logger = this.logger;
    // eslint-disable-next-line no-param-reassign
    this.koaApp.context.sentry = this.sentry;
    //
    this.koaApp.context.helpers = merge(
      {
        time,
        uuid,
        transliterator,
        BigNumber,
      },
      contextHelpers || {},
    );

    //
    this.httpServer = http.createServer(this.koaApp.callback());
  }

  processExitHandler(opts: ExceptionHandlerProps): (e?: Error) => void {
    const { cleanupFn, exit = false, exitCode = 1 } = opts;
    //
    return (e?: Error) => {
      //
      if (e) {
        this.logger?.error(e);
        //
        this.sentry?.captureException(e);
      }
      if (typeof cleanupFn === 'function') {
        cleanupFn(e)
          .catch(this.logger.error)
          .then(() => {
            if (!exit) {
              process.exit(exitCode);
            }
          });
      } else if (!exit) {
        setTimeout(() => process.exit(exitCode), 3000);
      }
    };
  }

  async initExceptionHandler(opts: ExceptionHandlerProps): Promise<void> {
    // Catch all exceptions
    process.on('exit', this.processExitHandler({ exit: true, ...opts }));
    process.on('SIGINT', this.processExitHandler(opts));
    process.on('SIGHUP', this.processExitHandler(opts));
    process.on('SIGTERM', this.processExitHandler(opts));
    process.on('SIGUSR1', this.processExitHandler(opts));
    process.on('SIGUSR2', this.processExitHandler(opts));
    process.on('uncaughtException', this.processExitHandler(opts));
    process.on('unhandledRejection', this.processExitHandler(opts));
  }

  // Init all API routes recursively
  initRoute(r: TodoAny | TodoAny[]): void {
    if (Array.isArray(r)) {
      flattenDeep(r).forEach((route) => this.initRoute(route));
      return;
    }
    if (typeof r === 'function') {
      r(this);
      return;
    }
    this.logger.error('Failed to init route', r);
  }

  initMultiLangMiddleware(): void {
    if (!this.multiLangOptions?.fallbackLng) {
      throw new DefaultError(
        'You must set "fallbackLng" inside "multiLangOptions" to enable multi-lang middleware',
        {
          meta: this.multiLangOptions,
        },
      );
    }
    const { fallbackLng } = this.multiLangOptions;
    //
    this.addMiddleware(async (ctx, next): Promise<void> => {
      //
      const i18nextInstance = i18next.cloneInstance();
      //
      ctx.i18next = i18nextInstance;
      // Saving language to the current koaContext
      const lng = detectContextLang(ctx, Server.LANG_DETECTION_DEFAULT_OPTIONS) || fallbackLng;
      await i18nextInstance.changeLanguage(lng);
      Server.setContextLang(ctx, lng, Server.LANG_DETECTION_DEFAULT_OPTIONS);
      //
      ctx.t = function translate(...args: any) {
        // @ts-ignore
        return ctx.i18next.t.apply(ctx.i18next, [...args]);
      };
      //
      await next();
    });
  }

  initAuthMiddleware(
    authHandler: (ctx: RouteContext<TAppContext, TDatabaseModels>) => Promise<void>,
  ): void {
    this.addBeforeMiddleware(async (ctx, next) => {
      // Check the Authorization cookie
      const token = ctx.cookies.get('token', { signed: true }) || ctx.get('authorization');
      if (!token) {
        await next();
        return;
      }
      try {
        const decodedAuthToken = decodeJWT(token) as { sub: string };
        ctx.state.authToken = token;
        ctx.state.decodedAuthToken = decodedAuthToken;
        //
        if (decodedAuthToken.sub) {
          //
          await authHandler(ctx as RouteContext<TAppContext, TDatabaseModels>);
        }
      } catch (exception) {
        this.logger.error(`[authMiddleware] ${exception.message}`);
        this.logger.error(exception);
      }
      //
      await next();
    });
  }

  static setAuthCookie(
    context: ParameterizedContext,
    token: string,
    options?: Partial<CookieOptions>,
  ): void {
    const {
      cookieName = 'token',
      secure = true,
      overwrite = true,
      httpOnly = true,
      signed = true,
      domain,
    } = options || {};
    // Saving user's token to cookies
    context.cookies.set(cookieName, token, {
      signed,
      httpOnly,
      overwrite,
      secure,
      domain,
    });
  }

  async bindModelsToDBConnection(p: InitDatabaseOptions<TDatabaseModels>): Promise<void> {
    // @ts-ignore
    this.db = await initDatabase<DatabaseModels>(this.dbConnection, p);
  }

  async startServer(params?: StartServerParams): Promise<http.Server> {
    //
    const httpTerminator = createHttpTerminator({
      server: this.httpServer,
    });
    // Gracefully shutdown our process in case of any uncaught exception
    await this.initExceptionHandler({
      async cleanupFn() {
        //
        httpTerminator
          .terminate()
          .catch(logger.error)
          .then(() => process.exit(1));
      },
    });

    /* CUSTOM APP INSTANTIATION */
    // Pass the `app` to do anything we need with it in userland. Useful for
    // custom instantiation that doesn't fit into the middleware/route functions
    if (typeof this.koaAppFunc === 'function') {
      await this.koaAppFunc(this.koaApp);
    }

    // It's useful to see how long a request takes to respond.  Add the
    // timing to a HTTP Response header
    this.koaApp.use(async (ctx, next) => {
      const start = ms.now();
      await next();
      const end = ms.parse(ms.since(start));
      const total = end.microseconds + end.milliseconds * 1e3 + end.seconds * 1e6;
      ctx.set('X-Response-Time', `${total / 1e3}ms`);
    });

    // Save client's ip to the context
    this.koaApp.use(async (ctx, next) => {
      ctx.state.countryCode = ctx.get('cf-ipcountry');
      ctx.state.userAgent = ctx.get('user-agent');
      ctx.state.ip =
        process.env.HOST === 'localhost'
          ? '127.0.0.1'
          : ctx.get('Cf-Connecting-Ip') ||
            ctx.get('X-Real-Ip') ||
            ctx.get('X-Forwarded-For') ||
            ctx.request.ip;
      //
      await next();
    });

    // Add 'before' middleware that needs to be invoked before the per-request store has instantiated
    this.beforeMiddleware.forEach((middlewareFunc) => this.koaApp.use(middlewareFunc));

    // Connect universalCookies middleware
    this.koaApp.use(cookiesMiddleware());

    this.koaApp.use(bodyParser(this.bodyParserOptions));

    /* Enable working behind nginx */
    this.koaApp.proxy = true;

    // Middleware to add preliminary security for HTTP headers via Koa Helmet
    this.koaApp.use(koaHelmet());

    // Attach custom middleware
    this.middleware.forEach((middlewareFunc) => this.koaApp.use(middlewareFunc));

    // Attach any custom routes we may have set in userland
    // Handle both added by initRoute function
    // and server.add*X*Route method
    this.routes.forEach((route) => {
      // @ts-ignore
      this.router[route.method](`/api${route.route}`, ...route.handlers);
    });

    // We'll also add a generic error handler, that prints out to the stdout.
    // Note: This is a 'lower-level' than `config.setErrorHandler()` because
    // it's not middleware -- it's for errors that happen at the server level
    this.koaApp.on('error', (error) => {
      // This function should never show up, because `server.setErrorHandler()`
      // is already catching errors -- but just an FYI for what you might do.
      if (logger && typeof logger.error === 'function') {
        logger.error(error);
      }
      //
      if (Sentry && typeof Sentry.captureException === 'function') {
        Sentry.captureException(error);
      }
    });

    // Connect the REST API routes to the server
    this.koaApp.use(this.router.routes()).use(this.router.allowedMethods());

    //
    if (typeof params?.beforeListen === 'function') {
      await params?.beforeListen();
    }
    //
    this.httpServer.listen(this.port);

    // Log to the terminal that we're ready for action
    logServerStarted({
      type: 'server',
    });

    return this.httpServer;
  }

  async startWSServer(
    httpServerOrPort: number | http.Server,
    o?: Partial<WSServerOptions>,
  ): Promise<WebsocketServer> {
    const { adapter, path, wsEngine = eiowsEngine, cors: corsOptions, ...opts } = o || {};
    const { allowedOrigins } = this;
    const defaultCORSOptions: ExpressCORSOptions = {
      credentials: this.corsOptions.credentials,
      origin(origin, callback) {
        if (allowedOrigins.has('*')) {
          callback(null, true);
          return;
        }
        if (origin && allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Request blocked due to CORS policy'));
      },
    };
    //
    const ws = new WebsocketServer(
      // @ts-ignore
      httpServerOrPort,
      merge(
        {
          cors: merge(defaultCORSOptions, corsOptions),
        },
        opts,
        {
          path: path || '/socket.io',
          wsEngine,
          adapter:
            adapter ||
            createAdapter(`redis://${redis.options.host}:${redis.options.port}`, {
              requestsTimeout: 5000,
            }),
        },
      ),
    );

    if (!ws) {
      throw new Error('Failed to start websocket-server');
    }
    this.ws = ws;

    // @ts-ignore
    this.wsEventEmitter = initWSEventEmitter(redis);

    return ws;
  }

  async joinWSRoom(socket: Socket, roomId: string): Promise<void> {
    try {
      if (!this.ws) {
        logger.info(`Failed to join client to the room "${roomId}, ws-server is not running"`);
        return;
      }
      //
      const adapter = this.ws.of('/').adapter as unknown as RedisAdapter;
      await adapter.remoteJoin(socket.id, `${roomId}`);
    } catch (err) {
      this.logger.error(err);
      this.sentry?.captureException(err);
    }
  }

  async sendWSEvent(roomId: string, event: string, data?: { [k: string]: TodoAny }): Promise<void> {
    if (!this.wsEventEmitter) {
      logger.info(
        `Failed to send event "${event}" to the room "${roomId}, ws-server is not running"`,
        data,
      );
      return;
    }
    //
    logger.info(`Send event "${event}" to the room "${roomId}"`, data);
    if (roomId === 'any') {
      this.wsEventEmitter.emit(event, data);
      return;
    }
    this.wsEventEmitter.to(roomId).emit(event, data);
  }

  // Get access to Koa's `app` instance, for adding custom instantiation
  // or doing something that's not covered by other functions
  getKoaApp(func: (app: Koa) => Promise<void>): void {
    this.koaAppFunc = func;
  }

  // 404 handler for the server.  By default, `kit/entry/server.js` will
  // simply return a 404 status code without modifying the HTML render.  By
  // setting a handler here, this will be returned instead
  set404Handler(func: RouteHandler<TAppContext, TDatabaseModels>): void {
    if (typeof func !== 'function') {
      throw new Error('404 handler must be a function');
    }
    this.handler404 = func;
  }

  // Error handler.  If this isn't defined, the server will simply return a
  // 'There was an error. Please try again later.' message, and log the output
  // to the console.  Override that behaviour by passing a (e, ctx, next) -> {} func
  setErrorHandler(func: ErrorHandler<TAppContext, TDatabaseModels>): void {
    if (typeof func !== 'function') {
      throw new Error('Error handler must be a function');
    }
    this.errorHandler = func;
  }

  // Add custom middleware.  This should be an async func, for use with Koa.
  // There are two entry points - 'before' and 'after'
  addBeforeMiddleware(
    middlewareFunc: Middleware<ContextState, RouteContext<TAppContext, TDatabaseModels>>,
  ): void {
    this.beforeMiddleware.add(middlewareFunc);
  }

  addMiddleware(
    middlewareFunc: Middleware<ContextState, RouteContext<TAppContext, TDatabaseModels>>,
  ): void {
    this.middleware.add(middlewareFunc);
  }

  //
  addRouteParam(param: string, handler: IParamMiddleware): void {
    this.routeParams.add({
      param,
      handler,
    });
  }

  // Adds a custom server route to attach to our Koa router
  addRoute(
    method: RouteMethod,
    route: string,
    ...handlers: RouteHandler<TAppContext, TDatabaseModels>[]
  ): void {
    this.routes.add({
      method,
      route,
      handlers,
    });
  }

  // Adds custom GET route
  addGetRoute(route: string, ...handlers: RouteHandler<TAppContext, TDatabaseModels>[]): void {
    this.addRoute('get', route, ...handlers);
  }

  // Adds custom POST route
  addPostRoute(route: string, ...handlers: RouteHandler<TAppContext, TDatabaseModels>[]): void {
    this.addRoute('post', route, ...handlers);
  }

  // Adds custom PUT route
  addPutRoute(route: string, ...handlers: RouteHandler<TAppContext, TDatabaseModels>[]): void {
    this.addRoute('put', route, ...handlers);
  }

  // Adds custom PATCH route
  addPatchRoute(route: string, ...handlers: RouteHandler<TAppContext, TDatabaseModels>[]): void {
    this.addRoute('patch', route, ...handlers);
  }

  // Adds custom DELETE route
  addDeleteRoute(route: string, ...handlers: RouteHandler<TAppContext, TDatabaseModels>[]): void {
    this.addRoute('delete', route, ...handlers);
  }

  async sendErrorToSentry(error: SentryError, args: SentryErrorProps): Promise<void> {
    if (!this.sentry) {
      const e =
        'Sentry instance has not been initialized. Failed to send error to the Sentry cloud';
      this.logger.error(e);
      this.logger.error(error);
      return;
    }
    // @ts-ignore
    let meta: any = error.data || {};
    //
    if (error instanceof DefaultError && error.originalError instanceof DefaultError) {
      meta = { ...error.originalError.data, ...meta };
    }
    // Converting string error to Error instance
    if (
      error instanceof ValidationError ||
      error instanceof DatabaseError ||
      error instanceof UniqueConstraintError
    ) {
      // If we've got a Sequelize validationError,
      // than we should get the first error from array of errors
      // eslint-disable-next-line prefer-destructuring
      meta.instance = pick(get(error, 'errors[0].instance', {}), [
        'dataValues',
        '_changed',
        '_previousDataValues',
      ]);
      meta.origin = get(error, 'errors[0].origin');
    }
    //
    const { request } = args;
    let { messagePrefix = '' } = args;
    const messagePrefixChunks = [];
    //
    const method =
      // get http-request-method from koa request
      get(request, 'method') ||
      // get it from request config
      meta.method;
    if (method) {
      messagePrefixChunks.push(method);
    }
    //
    const path =
      // get path from koa request
      get(request, 'path') ||
      // get method/path from request config (for example, bitcoin-request's params.method)
      get(meta, 'url');
    if (path) {
      messagePrefixChunks.push(path);
    }
    if (messagePrefixChunks.length > 0) {
      //
      messagePrefix = `${messagePrefix}[${compact(messagePrefixChunks).join(' ')}] `;
    }
    // Try to get meta data from the args if error has been emitted not from koa web-server (doesn't have any context.request)
    if (!request) {
      Object.keys(args).forEach((argKey) => {
        // @ts-ignore
        const v = args[argKey];
        if (messagePrefix === v) {
          return;
        }
        if (typeof v !== 'string' && typeof v !== 'number') {
          return;
        }
        meta[argKey] = v;
      });
    }
    //
    this.sentry.withScope((scope) => {
      if (request) {
        // @ts-ignore
        scope.addEventProcessor((event) => Sentry.Handlers.parseRequest(event, request));
      }
      //
      const exception = typeof error === 'string' ? new Error(error) : error;
      exception.message = `${messagePrefix}${exception.message}`;
      // @ts-ignore
      exception.data = meta;
      // Group errors together based on their message
      const fingerprint = ['{{ default }}'];
      if (messagePrefix) {
        fingerprint.push(messagePrefix);
      }
      if (exception.message) {
        fingerprint.push(exception.message);
      }
      scope.setFingerprint(fingerprint);
      //
      this.sentry?.captureException(exception);
    });
  }
}

export default Server;
