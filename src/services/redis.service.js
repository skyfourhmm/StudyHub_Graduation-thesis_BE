const redis = require("redis");
const config = require("../configs/config");

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: config.redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === "ECONNREFUSED") {
            return new Error("The server refused the connection");
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error("Retry time exhausted");
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        },
      });

      this.client.on("error", (err) => {
        console.error("Redis Client Error: ", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("Redis connected successfully!");
        this.isConnected = true;
      });

      this.client.on("ready", () => {
        console.log("Redis ready to use");
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error("Redis connection failed: ", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        console.log("Redis disconnected");
      }
    } catch (error) {
      console.error("Error disconnecting Redis:", error);
    }
  }

  async saveAccessToken({ userId, token, expiresIn = 15 * 60 }) {
    try {
      if (!this.isConnected) {
        throw new Error("Redis not connected");
      }

      const key = `access_token:${userId}:${token}`;
      await this.client.setEx(
        key,
        expiresIn,
        JSON.stringify({
          userId,
          token,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        })
      );

      await this.client.sAdd(`user_access_tokens:${userId}`, token);
      console.log(`Token saved for user ${userId}`);
      return true;
    } catch (error) {
      console.error("Error saving token: ", error);
      return false;
    }
  }

  async saveRefreshToken({ userId, token, expiresIn = 24 * 60 * 60 }) {
    try {
      if (!this.isConnected) {
        throw new Error("Redis not connected");
      }

      const key = `refresh_token:${userId}:${token}`;
      await this.client.setEx(
        key,
        expiresIn,
        JSON.stringify({
          userId,
          token,
          type: "refresh",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        })
      );

      await this.client.sAdd(`user_refresh_tokens:${userId}`, token);
      console.log(`Refresh token saved for user ${userId}`);
      return true;
    } catch (error) {
      console.error("Error saving refresh token: ", error);
      return false;
    }
  }

  async isValidAccessToken({ userId, token }) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const key = `access_token:${userId}:${token}`;
      const tokenData = await this.client.get(key);

      if (!tokenData) {
        return false;
      }

      const parsedToken = JSON.parse(tokenData);
      const now = new Date();
      const expiresAt = new Date(parsedToken.expiresAt);

      if (now > expiresAt) {
        await this.removeAccessToken({ userId, token });
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking token validity:", error);
      return false;
    }
  }

  async isValidRefreshToken({ userId, token }) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const key = `refresh_token:${userId}:${token}`;
      const tokenData = await this.client.get(key);

      if (!tokenData) {
        return false;
      }

      const parsedToken = JSON.parse(tokenData);

      const now = new Date();
      const expiresAt = new Date(parsedToken.expiresAt);

      if (now > expiresAt) {
        await this.removeRefreshToken({ userId, token });
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking refresh token validity:", error);
      return false;
    }
  }

  async removeAccessToken({ userId, token }) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const key = `access_token:${userId}:${token}`;
      await this.client.del(key);

      // Xóa khỏi danh sách access tokens của user
      await this.client.sRem(`user_access_tokens:${userId}`, token);
      console.log(`Token removed for user ${userId}`);
      return true;
    } catch (error) {
      console.error("Error removing token: ", error);
      return false;
    }
  }

  async removeRefreshToken({ userId, token }) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const key = `refresh_token:${userId}:${token}`;
      await this.client.del(key);

      // Xóa khỏi danh sách refresh tokens của user
      await this.client.sRem(`user_refresh_tokens:${userId}`, token);
      console.log(`Refresh token removed for user ${userId}`);
      return true;
    } catch (error) {
      console.error("Error removing refresh token: ", error);
      return false;
    }
  }

  async removeToken({ userId, token }) {
    try {
      if (!this.isConnected) {
        return false;
      }

      const accessKey = `access_token:${userId}:${token}`;
      const accessExists = await this.client.exists(accessKey);
      if (accessExists) {
        await this.client.del(accessKey);
        await this.client.sRem(`user_access_tokens:${userId}`, token);
        console.log(`Access token removed for user ${userId}`);
        return true;
      }

      const refreshKey = `refresh_token:${userId}:${token}`;
      const refreshExists = await this.client.exists(refreshKey);
      if (refreshExists) {
        await this.client.del(refreshKey);
        await this.client.sRem(`user_refresh_tokens:${userId}`, token);
        console.log(`Refresh token removed for user ${userId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error removing token: ", error);
      return false;
    }
  }

  async removeAllUserTokens(userId) {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Xóa tất cả Access Tokens
      const userAccessTokens = await this.client.sMembers(
        `user_access_tokens:${userId}`
      );
      for (const token of userAccessTokens) {
        const key = `access_token:${userId}:${token}`;
        await this.client.del(key);
      }
      await this.client.del(`user_access_tokens:${userId}`);

      // Xóa tất cả Refresh Tokens
      const userRefreshTokens = await this.client.sMembers(
        `user_refresh_tokens:${userId}`
      );
      for (const token of userRefreshTokens) {
        const key = `refresh_token:${userId}:${token}`;
        await this.client.del(key);
      }
      await this.client.del(`user_refresh_tokens:${userId}`);

      console.log(`All tokens removed for user ${userId}`);
      return true;
    } catch (error) {
      console.error("Error removing all user tokens:", error);
      return false;
    }
  }

  async getTokenInfo({ userId, token }) {
    try {
      if (!this.isConnected) {
        return null;
      }

      const key = `access_token:${userId}:${token}`;
      const tokenData = await this.client.get(key);

      if (!tokenData) {
        return null;
      }

      return JSON.parse(tokenData);
    } catch (error) {
      console.error("Error getting token info:", error);
      return null;
    }
  }

  async getUserActiveSessions(userId) {
    try {
      if (!this.isConnected) {
        return { accessTokens: 0, refreshTokens: 0 };
      }

      const accessTokens = await this.client.sMembers(
        `user_access_tokens:${userId}`
      );
      const refreshTokens = await this.client.sMembers(
        `user_refresh_tokens:${userId}`
      );

      return {
        accessTokens: accessTokens.length,
        refreshTokens: refreshTokens.length,
        total: accessTokens.length + refreshTokens.length,
      };
    } catch (error) {
      console.error("Error getting user active sessions:", error);
      return { accessTokens: 0, refreshTokens: 0, total: 0 };
    }
  }

  async cleanupExpiredTokens() {
    try {
      if (!this.isConnected) {
        return;
      }

      const now = new Date();

      // Cleanup access tokens
      const accessTokenKeys = await this.client.keys("access_token:*");
      for (const key of accessTokenKeys) {
        const tokenData = await this.client.get(key);
        if (tokenData) {
          const parsedToken = JSON.parse(tokenData);
          const expiresAt = new Date(parsedToken.expiresAt);

          if (now > expiresAt) {
            await this.client.del(key);
            await this.client.sRem(
              `user_access_tokens:${parsedToken.userId}`,
              parsedToken.token
            );
          }
        }
      }

      // Cleanup refresh tokens
      const refreshTokenKeys = await this.client.keys("refresh_token:*");
      for (const key of refreshTokenKeys) {
        const tokenData = await this.client.get(key);
        if (tokenData) {
          const parsedToken = JSON.parse(tokenData);
          const expiresAt = new Date(parsedToken.expiresAt);

          if (now > expiresAt) {
            await this.client.del(key);
            await this.client.sRem(
              `user_refresh_tokens:${parsedToken.userId}`,
              parsedToken.token
            );
          }
        }
      }

      console.log("Cleanup expired tokens completed");
    } catch (error) {
      console.error("Error cleaning up expired tokens:", error);
    }
  }
}

const redisService = new RedisService();
module.exports = redisService;
