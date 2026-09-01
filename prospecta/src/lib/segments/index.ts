import type { SegmentConfig, Subsegment } from "./types";
import { foodService } from "./food-service";
import { saude } from "./saude";
import { arquitetura } from "./arquitetura";
import { utensilios } from "./utensilios";

/** Registro de segmentos. Adicione o novo mercado aqui e ele aparece no app. */
export const SEGMENTS: SegmentConfig[] = [foodService, arquitetura, utensilios, saude];

export const DEFAULT_SEGMENT = foodService.slug;

export function getSegment(slug: string | null | undefined): SegmentConfig {
  return SEGMENTS.find((s) => s.slug === slug) ?? foodService;
}

export function getSubsegment(segmentSlug: string, subSlug: string | null): Subsegment | null {
  if (!subSlug) return null;
  return getSegment(segmentSlug).subsegments.find((s) => s.slug === subSlug) ?? null;
}

export type { SegmentConfig, Subsegment };
