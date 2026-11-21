import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 045 — HandzJ Brand DNA & Appearance Control
 *
 * Stores versioned, publishable design tokens.
 * Foundational HandzJ DNA is seeded as the locked baseline.
 * Application appearance can be drafted/published without scattering hard-coded colours.
 *
 * Non-destructive. Does not alter financial data.
 */
export class BrandDnaGovernance1700000000045 implements MigrationInterface {
  name = 'BrandDnaGovernance1700000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS brand_theme_versions (
        id                SERIAL PRIMARY KEY,
        product_code      VARCHAR(60) NOT NULL DEFAULT 'bingo_vintage',
        version_label     VARCHAR(80) NOT NULL,
        status            VARCHAR(20) NOT NULL DEFAULT 'draft',
        -- draft | published | archived
        is_foundational   BOOLEAN NOT NULL DEFAULT false,
        tokens            JSONB NOT NULL,
        notes             TEXT NULL,
        created_by_id     INTEGER NULL,
        published_by_id   INTEGER NULL,
        published_at      TIMESTAMPTZ NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_brand_theme_product_status
        ON brand_theme_versions (product_code, status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS brand_theme_history (
        id                SERIAL PRIMARY KEY,
        product_code      VARCHAR(60) NOT NULL DEFAULT 'bingo_vintage',
        theme_version_id  INTEGER NOT NULL,
        action            VARCHAR(40) NOT NULL,
        actor_user_id     INTEGER NULL,
        detail            JSONB NULL,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Foundational HandzJ DNA — published baseline
    await queryRunner.query(`
      INSERT INTO brand_theme_versions
        (product_code, version_label, status, is_foundational, tokens, notes, published_at)
      VALUES (
        'bingo_vintage',
        'handzj-dna-v1',
        'published',
        true,
        $1::jsonb,
        'Foundational HandzJ Tech Brand DNA. Protected identity layer.',
        NOW()
      )
      `, [JSON.stringify({
      identity: {
        deepInk: '#101820',
        graphite: '#263238',
        warmIvory: '#F7F5EF',
        signalGreen: '#16836A',
        deepGreen: '#0D5C4A',
        amber: '#D99A2B',
      },
      light: {
        text: '#101820',
        muted: '#263238',
        meta: '#5C6B73',
        canvas: '#F7F5EF',
        surface: '#FFFFFF',
        sidebar: '#101820',
        header: '#FFFFFF',
        border: '#D9D2C5',
        borderStrong: '#B8AFA0',
        action: '#0D5C4A',
        actionHover: '#16836A',
        actionMuted: '#263238',
        accent: '#16836A',
        accentLight: '#E6F5F0',
        success: '#0D5C4A',
        successBg: '#E6F5F0',
        warning: '#D99A2B',
        warningBg: '#FBF3E0',
        danger: '#8B2942',
        dangerBg: '#FCECF0',
        info: '#16836A',
        infoBg: '#E6F5F0',
      },
      typography: {
        fontSans: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        scale: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
      },
      density: {
        radius: '0.375rem',
        sectionGap: '1.5rem',
        pagePadding: '1.5rem',
      },
      protectedKeys: [
        'identity.deepInk',
        'identity.graphite',
        'identity.warmIvory',
        'identity.signalGreen',
        'identity.deepGreen',
        'identity.amber',
      ],
    })]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS brand_theme_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS brand_theme_versions CASCADE`);
  }
}
