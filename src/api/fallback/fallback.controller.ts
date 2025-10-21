import { Public } from '@/common/decorators/public.decorator';
import { All, Controller, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

/**
 * Fallback Controller - Handles all unmatched routes
 *
 * This controller has two catch-all routes:
 * 1. Root-level routes (favicon.ico, .well-known/*, etc.)
 * 2. API-prefixed routes (/api/*)
 *
 * Returns 204 No Content instead of 404 errors.
 *
 * @example
 * GET /.well-known/appspecific/com.chrome.devtools.json -> 204 No Content
 * GET /favicon.ico -> 204 No Content
 * GET /api/undefined -> 204 No Content
 */
@ApiExcludeController()
@Controller()
export class FallbackController {
  private readonly logger = new Logger(FallbackController.name);

  /**
   * Catch-all for root-level unmatched routes
   * This handles: /favicon.ico, /.well-known/*, /robots.txt, etc.
   */
  /**
   * Handle common root-level requests
   * Note: .well-known/* cannot be caught due to Fastify routing limitations
   * It will be silently handled by the GlobalExceptionFilter instead
   */
  @Public()
  @All('favicon.ico')
  @HttpCode(HttpStatus.NO_CONTENT)
  handleFavicon(): void {
    return;
  }

  @Public()
  @All('robots.txt')
  @HttpCode(HttpStatus.NO_CONTENT)
  handleRobots(): void {
    return;
  }

  @Public()
  @All('sitemap.xml')
  @HttpCode(HttpStatus.NO_CONTENT)
  handleSitemap(): void {
    return;
  }

  @Public()
  @All('apple-touch-icon.png')
  @HttpCode(HttpStatus.NO_CONTENT)
  handleAppleIcon(): void {
    return;
  }

  @Public()
  @All('apple-touch-icon-precomposed.png')
  @HttpCode(HttpStatus.NO_CONTENT)
  handleAppleIconPrecomposed(): void {
    return;
  }

  @Public()
  @All('manifest.json')
  @HttpCode(HttpStatus.NO_CONTENT)
  handleManifest(): void {
    return;
  }

  /**
   * Catch-all for API-prefixed unmatched routes
   * This is registered under the API prefix: /api/*
   */
  @Public()
  @All('*')
  @HttpCode(HttpStatus.NO_CONTENT)
  handleApiUnmatched(): void {
    // Silently ignore unmatched API routes
    // Uncomment the line below if you need to debug
    // this.logger.debug(`Unmatched API route: ${req.method} ${req.url}`);
    return;
  }
}
