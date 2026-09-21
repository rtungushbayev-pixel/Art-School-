import { supabase } from './supabase';
import type { ListingStatus } from '../types/database';

export interface ListingCardData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  status: ListingStatus;
  sold: boolean;
  created_at: string;
  seller: { id: string; full_name: string; avatar_url: string | null } | null;
  images: { id: string; image_url: string }[];
}

interface RawListing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  status: ListingStatus;
  sold: boolean;
  created_at: string;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  marketplace_listing_images: { id: string; image_url: string; position: number }[];
}

const SELECT = `
  id, title, description, price, currency, status, sold, created_at,
  profiles:seller_id ( id, full_name, avatar_url ),
  marketplace_listing_images ( id, image_url, position )
`;

function toCardData(raw: RawListing): ListingCardData {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    price: raw.price,
    currency: raw.currency,
    status: raw.status,
    sold: raw.sold,
    created_at: raw.created_at,
    seller: raw.profiles,
    images: [...(raw.marketplace_listing_images ?? [])].sort((a, b) => a.position - b.position),
  };
}

export async function fetchApprovedListings(): Promise<ListingCardData[]> {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(SELECT)
    .eq('status', 'approved')
    .eq('sold', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as unknown as RawListing[]) ?? []).map(toCardData);
}

export async function fetchMyListings(userId: string): Promise<ListingCardData[]> {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(SELECT)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data as unknown as RawListing[]) ?? []).map(toCardData);
}

export async function fetchPendingListings(): Promise<ListingCardData[]> {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data as unknown as RawListing[]) ?? []).map(toCardData);
}

export function formatPrice(price: number, currency: string) {
  const formatted = new Intl.NumberFormat('ru-RU').format(price);
  const symbol = currency === 'KZT' ? '₸' : currency;
  return `${formatted} ${symbol}`;
}
