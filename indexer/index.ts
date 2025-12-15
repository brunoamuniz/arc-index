import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || process.env.ARC_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL!;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '5042002', 10);
const PROJECT_REGISTRY_ADDRESS = process.env.PROJECT_REGISTRY_ADDRESS as Address;
const APPROVAL_NFT_ADDRESS = process.env.APPROVAL_NFT_ADDRESS as Address;
const RATINGS_ADDRESS = process.env.RATINGS_ADDRESS as Address;
const FUNDING_ADDRESS = process.env.FUNDING_ADDRESS as Address;
const INDEXER_POLL_INTERVAL_MS = parseInt(process.env.INDEXER_POLL_INTERVAL_MS || '5000', 10);
const INDEXER_FROM_BLOCK = BigInt(process.env.INDEXER_FROM_BLOCK || '0');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Create viem client
const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

// Event ABIs
const projectRegistryAbi = parseAbi([
  'event ProjectCreated(uint256 indexed projectId, address indexed owner, string metadataUri)',
  'event ProjectMetadataUpdated(uint256 indexed projectId, string metadataUri)',
  'event ProjectSubmitted(uint256 indexed projectId)',
  'event ProjectApproved(uint256 indexed projectId)',
  'event ProjectRejected(uint256 indexed projectId, uint8 reasonCode, string reasonText)',
]);

const approvalNFTAbi = parseAbi([
  'event ApprovalMinted(uint256 indexed projectId, uint256 indexed tokenId, address indexed to)',
]);

const ratingsAbi = parseAbi([
  'event Rated(uint256 indexed projectId, address indexed rater, uint8 stars)',
]);

const fundingAbi = parseAbi([
  'event Funded(uint256 indexed projectId, address indexed funder, uint256 amount)',
]);

async function getLastProcessedBlock(): Promise<bigint> {
  const { data } = await supabase
    .from('arcindex_chain_events')
    .select('block_number')
    .order('block_number', { ascending: false })
    .limit(1)
    .single();

  return data?.block_number ? BigInt(data.block_number) : INDEXER_FROM_BLOCK;
}

async function processEvent(event: any, eventName: string) {
  const { data: existing } = await supabase
    .from('arcindex_chain_events')
    .select('id')
    .eq('chain_id', CHAIN_ID)
    .eq('tx_hash', event.transactionHash)
    .eq('log_index', event.logIndex)
    .single();

  if (existing) {
    return; // Already processed
  }

  // Insert chain event
  const { error: insertError } = await supabase
    .from('arcindex_chain_events')
    .insert({
      chain_id: CHAIN_ID,
      tx_hash: event.transactionHash,
      log_index: event.logIndex,
      event_name: eventName,
      project_chain_id: event.args.projectId ? Number(event.args.projectId) : null,
      payload: event.args,
      block_number: Number(event.blockNumber),
      block_time: new Date(Number(event.blockNumber) * 1000).toISOString(),
    });

  if (insertError) {
    console.error('Error inserting chain event:', insertError);
    return;
  }

  // Process based on event type
  if (eventName === 'ProjectCreated' && event.args.projectId) {
    await handleProjectCreated(Number(event.args.projectId), event.args.owner);
  } else if (eventName === 'ProjectApproved' && event.args.projectId) {
    await handleProjectApproved(Number(event.args.projectId));
  } else if (eventName === 'Rated' && event.args.projectId) {
    await handleRated(Number(event.args.projectId), event.args.rater, Number(event.args.stars));
  } else if (eventName === 'Funded' && event.args.projectId) {
    await handleFunded(Number(event.args.projectId), Number(event.args.amount));
  } else if (eventName === 'ApprovalMinted' && event.args.projectId) {
    await handleApprovalMinted(Number(event.args.projectId), Number(event.args.tokenId), event.args.to);
  }
}

async function handleProjectCreated(projectId: number, owner: Address) {
  // Find project in Supabase by owner_wallet and status='Submitted' or 'Approved'
  // that doesn't have a project_id yet
  const { data: projects } = await supabase
    .from('arcindex_projects')
    .select('*')
    .eq('owner_wallet', owner.toLowerCase())
    .in('status', ['Submitted', 'Approved'])
    .is('project_id', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (projects && projects.length > 0) {
    const project = projects[0];
    // Update project with on-chain project_id
    await supabase
      .from('arcindex_projects')
      .update({ project_id: projectId })
      .eq('id', project.id);
    
    console.log(`Updated project ${project.id} with on-chain project_id ${projectId}`);
  } else {
    console.log(`No matching project found for ProjectCreated event: projectId=${projectId}, owner=${owner}`);
  }
}

async function handleProjectApproved(projectId: number) {
  // Update project status in Supabase
  const { data: project } = await supabase
    .from('arcindex_projects')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (project) {
    await supabase
      .from('arcindex_projects')
      .update({ status: 'Approved' })
      .eq('id', project.id);
  }
}

async function handleApprovalMinted(projectId: number, tokenId: number, to: Address) {
  const { data: project } = await supabase
    .from('arcindex_projects')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (project) {
    await supabase
      .from('arcindex_projects')
      .update({
        nft_token_id: tokenId,
        nft_contract_address: APPROVAL_NFT_ADDRESS,
      })
      .eq('id', project.id);
  }
}

async function handleRated(projectId: number, rater: Address, stars: number) {
  const { data: project } = await supabase
    .from('arcindex_projects')
    .select('id')
    .eq('project_id', projectId)
    .single();

  if (!project) return;

  // Upsert rating
  await supabase
    .from('arcindex_ratings')
    .upsert({
      project_id: project.id,
      rater: rater.toLowerCase(),
      stars,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'project_id,rater',
    });

  // Recalculate aggregate
  const { data: allRatings } = await supabase
    .from('arcindex_ratings')
    .select('stars')
    .eq('project_id', project.id);

  if (!allRatings) return;

  if (allRatings && allRatings.length > 0) {
    const totalStars = allRatings.reduce((sum, r) => sum + r.stars, 0);
    const avgStars = totalStars / allRatings.length;

    await supabase
      .from('arcindex_ratings_agg')
      .upsert({
        project_id: project.id,
        avg_stars: avgStars,
        ratings_count: allRatings.length,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id',
      });
  }
}

async function handleFunded(projectId: number, amount: number) {
  const { data: project } = await supabase
    .from('arcindex_projects')
    .select('id')
    .eq('project_id', projectId)
    .single();

  if (!project) return;

  // Update funding aggregate
  const { data: existing } = await supabase
    .from('arcindex_funding_agg')
    .select('*')
    .eq('project_id', project.id)
    .single();

  const newTotal = (existing?.total_usdc || 0) + amount / 1e6; // USDC has 6 decimals
  const newCount = (existing?.funding_count || 0) + 1;

  await supabase
    .from('arcindex_funding_agg')
    .upsert({
      project_id: project.id,
      total_usdc: newTotal,
      funding_count: newCount,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'project_id',
    });
}

async function indexEvents() {
  try {
    const lastBlock = await getLastProcessedBlock();
    const currentBlock = await publicClient.getBlockNumber();
    const toBlock = currentBlock > lastBlock + 1000n ? lastBlock + 1000n : currentBlock;

    if (toBlock <= lastBlock) {
      return;
    }

    console.log(`Indexing blocks ${lastBlock} to ${toBlock}`);

    // Fetch events from all contracts
    const [projectCreatedEvents, projectApprovedEvents, nftEvents, ratingEvents, fundingEvents] = await Promise.all([
      publicClient.getLogs({
        address: PROJECT_REGISTRY_ADDRESS,
        event: parseAbi(['event ProjectCreated(uint256 indexed projectId, address indexed owner, string metadataUri)'])[0],
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'ProjectCreated' })))
        .catch(() => []),
      publicClient.getLogs({
        address: PROJECT_REGISTRY_ADDRESS,
        event: parseAbi(['event ProjectApproved(uint256 indexed projectId)'])[0],
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'ProjectApproved' })))
        .catch(() => []),
      publicClient.getLogs({
        address: APPROVAL_NFT_ADDRESS,
        event: approvalNFTAbi[0],
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'ApprovalMinted' })))
        .catch(() => []),
      publicClient.getLogs({
        address: RATINGS_ADDRESS,
        event: ratingsAbi[0],
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'Rated' })))
        .catch(() => []),
      publicClient.getLogs({
        address: FUNDING_ADDRESS,
        event: fundingAbi[0],
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'Funded' })))
        .catch(() => []),
    ]);

    // Process all events
    const allEvents = [...projectCreatedEvents, ...projectApprovedEvents, ...nftEvents, ...ratingEvents, ...fundingEvents];
    for (const event of allEvents) {
      await processEvent(event, event.eventName as string);
    }

    console.log(`Processed ${allEvents.length} events`);
  } catch (error) {
    console.error('Error indexing events:', error);
  }
}

// Main loop
async function main() {
  console.log('Starting indexer...');
  console.log(`Chain ID: ${CHAIN_ID}`);
  console.log(`Poll interval: ${INDEXER_POLL_INTERVAL_MS}ms`);

  while (true) {
    await indexEvents();
    await new Promise(resolve => setTimeout(resolve, INDEXER_POLL_INTERVAL_MS));
  }
}

main().catch(console.error);

