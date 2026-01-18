import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || process.env.ARC_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL!;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '5042002', 10);
// New Arc Index V2 contracts (preferred)
const ARC_INDEX_REGISTRY_ADDRESS = (process.env.ARC_INDEX_REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_ARC_INDEX_REGISTRY_ADDRESS) as Address;
const ARC_INDEX_CERTIFICATE_NFT_ADDRESS = (process.env.ARC_INDEX_CERTIFICATE_NFT_ADDRESS || process.env.NEXT_PUBLIC_ARC_INDEX_CERTIFICATE_NFT_ADDRESS) as Address;
// Legacy contracts (fallback)
const PROJECT_REGISTRY_ADDRESS = process.env.PROJECT_REGISTRY_ADDRESS as Address | undefined;
const APPROVAL_NFT_ADDRESS = process.env.APPROVAL_NFT_ADDRESS as Address | undefined;
const RATINGS_ADDRESS = process.env.RATINGS_ADDRESS as Address | undefined;
const FUNDING_ADDRESS = process.env.FUNDING_ADDRESS as Address | undefined;
const INDEXER_POLL_INTERVAL_MS = parseInt(process.env.INDEXER_POLL_INTERVAL_MS || '5000', 10);
const INDEXER_FROM_BLOCK = BigInt(process.env.INDEXER_FROM_BLOCK || '0');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Create viem client
const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

// Event ABIs - Arc Index V2 (new contracts)
const arcIndexRegistryAbi = parseAbi([
  'event ProjectSubmitted(uint256 indexed projectId, address indexed owner, string metadataURI)',
  'event ProjectApproved(uint256 indexed projectId, address indexed curator, uint256 indexed certificateTokenId)',
  'event ProjectFinalized(uint256 indexed projectId, address indexed owner, address indexed finalizer, uint256 certificateTokenId)',
  'event ProjectRejected(uint256 indexed projectId, address indexed curator, string reason)',
  'event ProjectRated(uint256 indexed projectId, address indexed rater, uint8 stars, uint32 newRatingCount, uint32 newRatingSum)',
  'event ProjectDonated(uint256 indexed projectId, address indexed donor, uint256 amount, uint256 fee)',
]);

const arcIndexCertificateNFTAbi = parseAbi([
  'event CertificateMinted(uint256 indexed projectId, uint256 indexed tokenId, address indexed to)',
]);

// Legacy event ABIs (for backward compatibility)
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
  // Arc Index V2 events (new contracts)
  if (eventName === 'ProjectFinalized' && event.args.projectId) {
    await handleProjectFinalized(
      Number(event.args.projectId),
      event.args.owner,
      Number(event.args.certificateTokenId)
    );
  } else if (eventName === 'ProjectSubmitted' && event.args.projectId) {
    await handleProjectSubmitted(Number(event.args.projectId), event.args.owner);
  } else if (eventName === 'ProjectApproved' && event.args.projectId && event.args.certificateTokenId) {
    // New contract: ProjectApproved includes certificateTokenId
    await handleProjectApprovedWithNFT(
      Number(event.args.projectId),
      Number(event.args.certificateTokenId)
    );
  } else if (eventName === 'ProjectRated' && event.args.projectId) {
    await handleProjectRated(Number(event.args.projectId), event.args.rater, Number(event.args.stars));
  } else if (eventName === 'ProjectDonated' && event.args.projectId) {
    await handleProjectDonated(Number(event.args.projectId), event.args.amount as bigint);
  } else if (eventName === 'CertificateMinted' && event.args.projectId) {
    await handleCertificateMinted(Number(event.args.projectId), Number(event.args.tokenId), event.args.to);
  }
  // Legacy events (for backward compatibility)
  else if (eventName === 'ProjectCreated' && event.args.projectId) {
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

// Arc Index V2 handlers
async function handleProjectFinalized(projectId: number, owner: Address, certificateTokenId: number) {
  console.log(`Handling ProjectFinalized: projectId=${projectId}, owner=${owner}, tokenId=${certificateTokenId}`);
  
  // Find project by owner_wallet and status='Approved' that doesn't have project_id yet
  // OR update existing project with matching project_id
  const { data: projects } = await supabase
    .from('arcindex_projects')
    .select('*')
    .or(`project_id.is.null,project_id.eq.${projectId}`)
    .eq('owner_wallet', owner.toLowerCase())
    .eq('status', 'Approved')
    .order('created_at', { ascending: false })
    .limit(1);

  if (projects && projects.length > 0) {
    const project = projects[0];
    const updateData: any = {
      project_id: projectId,
      nft_token_id: certificateTokenId,
      nft_contract_address: ARC_INDEX_CERTIFICATE_NFT_ADDRESS,
    };

    // Only update project_id if it's null
    if (!project.project_id) {
      updateData.project_id = projectId;
    }

    await supabase
      .from('arcindex_projects')
      .update(updateData)
      .eq('id', project.id);
    
    console.log(`✅ Updated project ${project.id} with project_id=${projectId}, nft_token_id=${certificateTokenId}`);
  } else {
    // Try to find by project_id if it already exists
    const { data: existingProject } = await supabase
      .from('arcindex_projects')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (existingProject) {
      await supabase
        .from('arcindex_projects')
        .update({
          nft_token_id: certificateTokenId,
          nft_contract_address: ARC_INDEX_CERTIFICATE_NFT_ADDRESS,
        })
        .eq('id', existingProject.id);
      console.log(`✅ Updated existing project ${existingProject.id} with nft_token_id=${certificateTokenId}`);
    } else {
      console.log(`⚠️  No matching project found for ProjectFinalized: projectId=${projectId}, owner=${owner}`);
    }
  }
}

async function handleProjectSubmitted(projectId: number, owner: Address) {
  // Find project by owner_wallet and status='Approved' that doesn't have project_id yet
  const { data: projects } = await supabase
    .from('arcindex_projects')
    .select('*')
    .eq('owner_wallet', owner.toLowerCase())
    .eq('status', 'Approved')
    .is('project_id', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (projects && projects.length > 0) {
    const project = projects[0];
    await supabase
      .from('arcindex_projects')
      .update({ project_id: projectId })
      .eq('id', project.id);
    console.log(`Updated project ${project.id} with on-chain project_id ${projectId}`);
  }
}

async function handleProjectApprovedWithNFT(projectId: number, certificateTokenId: number) {
  const { data: project } = await supabase
    .from('arcindex_projects')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (project) {
    await supabase
      .from('arcindex_projects')
      .update({
        status: 'Approved',
        nft_token_id: certificateTokenId,
        nft_contract_address: ARC_INDEX_CERTIFICATE_NFT_ADDRESS,
      })
      .eq('id', project.id);
    console.log(`Updated project ${project.id} with NFT token ID ${certificateTokenId}`);
  }
}

async function handleCertificateMinted(projectId: number, tokenId: number, to: Address) {
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
        nft_contract_address: ARC_INDEX_CERTIFICATE_NFT_ADDRESS,
      })
      .eq('id', project.id);
    console.log(`Updated project ${project.id} with certificate token ID ${tokenId}`);
  }
}

async function handleProjectRated(projectId: number, rater: Address, stars: number) {
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

async function handleProjectDonated(projectId: number, amount: bigint) {
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

  const amountUSDC = Number(amount) / 1e6; // USDC has 6 decimals
  const newTotal = (existing?.total_usdc || 0) + amountUSDC;
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

// Legacy handlers (for backward compatibility)
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
        nft_contract_address: APPROVAL_NFT_ADDRESS || ARC_INDEX_CERTIFICATE_NFT_ADDRESS,
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

    // Fetch events from Arc Index V2 contracts (new)
    const arcIndexEvents = ARC_INDEX_REGISTRY_ADDRESS ? await Promise.all([
      publicClient.getLogs({
        address: ARC_INDEX_REGISTRY_ADDRESS,
        event: arcIndexRegistryAbi.find(e => e.name === 'ProjectFinalized')!,
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'ProjectFinalized' })))
        .catch(() => []),
      publicClient.getLogs({
        address: ARC_INDEX_REGISTRY_ADDRESS,
        event: arcIndexRegistryAbi.find(e => e.name === 'ProjectSubmitted')!,
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'ProjectSubmitted' })))
        .catch(() => []),
      publicClient.getLogs({
        address: ARC_INDEX_REGISTRY_ADDRESS,
        event: arcIndexRegistryAbi.find(e => e.name === 'ProjectApproved')!,
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'ProjectApproved' })))
        .catch(() => []),
      publicClient.getLogs({
        address: ARC_INDEX_REGISTRY_ADDRESS,
        event: arcIndexRegistryAbi.find(e => e.name === 'ProjectRated')!,
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'ProjectRated' })))
        .catch(() => []),
      publicClient.getLogs({
        address: ARC_INDEX_REGISTRY_ADDRESS,
        event: arcIndexRegistryAbi.find(e => e.name === 'ProjectDonated')!,
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'ProjectDonated' })))
        .catch(() => []),
      ARC_INDEX_CERTIFICATE_NFT_ADDRESS ? publicClient.getLogs({
        address: ARC_INDEX_CERTIFICATE_NFT_ADDRESS,
        event: arcIndexCertificateNFTAbi.find(e => e.name === 'CertificateMinted')!,
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'CertificateMinted' })))
        .catch(() => []) : Promise.resolve([]),
    ]).then(results => results.flat()) : [];

    // Fetch events from legacy contracts (for backward compatibility)
    const legacyEvents = PROJECT_REGISTRY_ADDRESS ? await Promise.all([
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
      APPROVAL_NFT_ADDRESS ? publicClient.getLogs({
        address: APPROVAL_NFT_ADDRESS,
        event: approvalNFTAbi[0],
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'ApprovalMinted' })))
        .catch(() => []) : Promise.resolve([]),
      RATINGS_ADDRESS ? publicClient.getLogs({
        address: RATINGS_ADDRESS,
        event: ratingsAbi[0],
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'Rated' })))
        .catch(() => []) : Promise.resolve([]),
      FUNDING_ADDRESS ? publicClient.getLogs({
        address: FUNDING_ADDRESS,
        event: fundingAbi[0],
        fromBlock: lastBlock + 1n,
        toBlock,
      }).then(logs => logs.map(l => ({ ...l, eventName: 'Funded' })))
        .catch(() => []) : Promise.resolve([]),
    ]).then(results => results.flat()) : [];

    // Process all events (new contracts first, then legacy)
    const allEvents = [...arcIndexEvents, ...legacyEvents];
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

