--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (84bec44)
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO neondb_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: neondb_owner
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ArticleStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."ArticleStatus" AS ENUM (
    'DRAFTING',
    'TITLE_READY',
    'CONTENT_READY',
    'SLUG_DONE',
    'KEYWORDS_DONE',
    'CATEGORIZED',
    'READY_TO_PUBLISH',
    'PUBLISHED'
);


ALTER TYPE public."ArticleStatus" OWNER TO neondb_owner;

--
-- Name: ContentType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."ContentType" AS ENUM (
    'LAUNCH',
    'SPECIFICATION',
    'COMPARISON',
    'SALES',
    'REVIEW',
    'HOWTO',
    'ANALYSIS',
    'RUMOR'
);


ALTER TYPE public."ContentType" OWNER TO neondb_owner;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'EDITOR',
    'ANALYST'
);


ALTER TYPE public."Role" OWNER TO neondb_owner;

--
-- Name: SourceKind; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."SourceKind" AS ENUM (
    'YOUTUBE',
    'NEWS',
    'BLOG',
    'SPEC',
    'LAUNCH',
    'COMPARISON',
    'SALES',
    'REVIEW',
    'HOWTO',
    'ANALYSIS',
    'RUMOR'
);


ALTER TYPE public."SourceKind" OWNER TO neondb_owner;

--
-- Name: TopicStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."TopicStatus" AS ENUM (
    'NEW',
    'COLLECTED',
    'APPROVED',
    'PROCESSING',
    'DRAFTED',
    'PUBLISHED',
    'READY'
);


ALTER TYPE public."TopicStatus" OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Article; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Article" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    tl_dr text,
    body_html text NOT NULL,
    faq_html text,
    outline_json jsonb,
    "metaTitle" text,
    "metaDescription" text,
    "coverImageUrl" text,
    "publishedAt" timestamp(3) without time zone,
    "topicId" text,
    "sourceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "contentType" public."ContentType",
    keywords jsonb
);


ALTER TABLE public."Article" OWNER TO neondb_owner;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    action text NOT NULL,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO neondb_owner;

--
-- Name: Citation; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Citation" (
    id text NOT NULL,
    "articleId" text NOT NULL,
    "sourceUrl" text NOT NULL,
    "sourceType" text NOT NULL,
    title text,
    author text,
    "timestamp" integer,
    quote text
);


ALTER TABLE public."Citation" OWNER TO neondb_owner;

--
-- Name: Source; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Source" (
    id text NOT NULL,
    url text NOT NULL,
    kind public."SourceKind" NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "topicId" text,
    title text,
    "contentType" public."ContentType"
);


ALTER TABLE public."Source" OWNER TO neondb_owner;

--
-- Name: Topic; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Topic" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    status public."TopicStatus" DEFAULT 'NEW'::public."TopicStatus" NOT NULL,
    score double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Topic" OWNER TO neondb_owner;

--
-- Name: User; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."Role" DEFAULT 'EDITOR'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO neondb_owner;

--
-- Name: Wallet; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Wallet" (
    id text NOT NULL,
    "userId" text NOT NULL,
    coins integer DEFAULT 0 NOT NULL,
    tier text DEFAULT 'free'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Wallet" OWNER TO neondb_owner;

--
-- Name: WalletLedger; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."WalletLedger" (
    id text NOT NULL,
    "userId" text NOT NULL,
    event text NOT NULL,
    delta integer NOT NULL,
    meta jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WalletLedger" OWNER TO neondb_owner;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO neondb_owner;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.categories (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.categories OWNER TO neondb_owner;

--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.subcategories (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "categoryId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.subcategories OWNER TO neondb_owner;

--
-- Data for Name: Article; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Article" (id, slug, title, tl_dr, body_html, faq_html, outline_json, "metaTitle", "metaDescription", "coverImageUrl", "publishedAt", "topicId", "sourceId", "createdAt", "updatedAt", "contentType", keywords) FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AuditLog" (id, "userId", action, meta, "createdAt") FROM stdin;
\.


--
-- Data for Name: Citation; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Citation" (id, "articleId", "sourceUrl", "sourceType", title, author, "timestamp", quote) FROM stdin;
\.


--
-- Data for Name: Source; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Source" (id, url, kind, approved, "createdAt", "updatedAt", "topicId", title, "contentType") FROM stdin;
cmfzqjjj80001w79k7bst7lkn	https://www.news18.com/tech/adopt-swadeshi-dharmendra-pradhan-endorses-india-made-arattai-messaging-app-ws-kl-9594792.html	NEWS	f	2025-09-25 18:17:23.108	2025-09-25 18:17:23.108	cmfzqjj670000w79kbwo7ev4p	'Adopt Swadeshi': Dharmendra Pradhan Endorses India-Made 'Arattai' Messaging App	LAUNCH
cmfzqjk3m0003w79k1014soc0	https://www.barrons.com/articles/bitcoin-ethereum-xrp-price-crypto-8d2f1104	NEWS	f	2025-09-25 18:17:23.842	2025-09-25 18:17:23.842	cmfzqjjvs0002w79k6c9wxe9g	Bitcoin Price, XRP, Ethereum Fall. Why the Crypto Slump Is Continuing.	ANALYSIS
cmfzqjk3m0004w79k7qbddnb4	https://finance.yahoo.com/news/bitcoin-falls-below-110000-as-cautious-tone-sweeps-over-market-174033262.html	NEWS	f	2025-09-25 18:17:23.842	2025-09-25 18:17:23.842	cmfzqjjvs0002w79k6c9wxe9g	Bitcoin falls below $110,000 as 'cautious tone' sweeps over market	ANALYSIS
cmfzqjkme0006w79k5rb2q1g4	https://forza.net/news/forza-horizon-6-reveal	NEWS	f	2025-09-25 18:17:24.519	2025-09-25 18:17:24.519	cmfzqjkel0005w79kniwnzuzt	Get Ready to Explore Japan in Forza Horizon 6!	LAUNCH
cmfzqjl560008w79kyldcwt2i	https://www.ign.com/articles/borderlands-4-gets-fov-slider-on-console-performance-improvements-and-vault-hunter-buffs-in-big-new-update	NEWS	f	2025-09-25 18:17:25.194	2025-09-25 18:17:25.194	cmfzqjkxc0007w79k0a8qo6q3	Borderlands 4 Gets FOV Slider on Console, Performance Improvements, and Gear Buffs in Big New Update	LAUNCH
cmfzqs162000aw79kpr8bbh0k	https://www.news18.com/tech/adopt-swadeshi-dharmendra-pradhan-endorses-india-made-arattai-messaging-app-ws-kl-9594792.html	NEWS	f	2025-09-25 18:23:59.21	2025-09-25 18:23:59.21	cmfzqs0sn0009w79kgooq27vj	'Adopt Swadeshi': Dharmendra Pradhan Endorses India-Made 'Arattai' Messaging App	LAUNCH
cmfzqs2bm000gw79kmsu8rgof	https://finance.yahoo.com/news/security-from-what-the-unanswered-questions-about-how-trumps-tiktok-deal-will-work-080017673.html	NEWS	f	2025-09-25 18:24:00.706	2025-09-25 18:24:00.706	cmfzqs23d000fw79k3kislloc	'Security from what?': The unanswered questions about how Trump's TikTok deal will work	ANALYSIS
cmfzqs2vh000iw79kjf6typkl	https://forza.net/news/forza-horizon-6-reveal	NEWS	f	2025-09-25 18:24:01.421	2025-09-25 18:24:01.421	cmfzqs2n7000hw79kbi915041	Get Ready to Explore Japan in Forza Horizon 6!	LAUNCH
cmfzr85w0000kw79k6j0aojtv	https://www.news18.com/tech/adopt-swadeshi-dharmendra-pradhan-endorses-india-made-arattai-messaging-app-ws-kl-9594792.html	NEWS	f	2025-09-25 18:36:31.825	2025-09-25 18:36:31.825	cmfzr85hw000jw79kjeixmwd2	'Adopt Swadeshi': Dharmendra Pradhan Endorses India-Made 'Arattai' Messaging App	LAUNCH
cmfzr86i5000mw79kcnpyugup	https://forza.net/news/forza-horizon-6-reveal	NEWS	f	2025-09-25 18:36:32.622	2025-09-25 18:36:32.622	cmfzr869s000lw79khorkafxq	Get Ready to Explore Japan in Forza Horizon 6!	LAUNCH
cmg0iwhs20005laev20x34v5o	https://www.thehindu.com/news/national/odisha/cag-finds-serious-loopholes-in-crime-and-criminal-tracking-network-system-application-in-odisha/article70092586.ece	NEWS	f	2025-09-26 07:31:16.61	2025-09-26 07:31:16.61	cmg0iwhbu0004laevfbzpmype	CAG finds 'serious loopholes' in Crime and Criminal Tracking Network System application in Odisha	ANALYSIS
cmg0iwiw40007laev7b7ce1p4	https://www.pcgamer.com/games/grand-theft-auto/the-future-of-gta-roleplaying-announced-in-collaboration-with-rockstar-games/	NEWS	f	2025-09-26 07:31:18.052	2025-09-26 07:31:18.052	cmg0iwigo0006laevghmwj0eh	'The future of GTA roleplaying' announced in collaboration with Rockstar Games	LAUNCH
cmg0k1bs70009laevbrjwl0nd	https://www.ft.com/content/a74f8564-ed5a-42e9-8fb3-d2bddb2b8675	NEWS	f	2025-09-26 08:03:01.735	2025-09-26 08:03:01.735	cmg0k1bex0008laevr7ym0ve3	Accenture to ‘exit’ staff who cannot be retrained for age of AI	ANALYSIS
cmg0k1cdn000blaevw7co5hk7	https://www.ign.com/articles/rog-xbox-ally-x-and-rog-xbox-ally-price-finally-revealed-microsoft-goes-for-1000-for-most-powerful-version-amid-tariff-uncertainty	NEWS	f	2025-09-26 08:03:02.507	2025-09-26 08:03:02.507	cmg0k1c5h000alaev065xzfg7	ROG Xbox Ally X and ROG Xbox Ally Price Finally Revealed — Microsoft Goes for $1,000 for Most Powerful Version Amid Tariff Uncertainty	LAUNCH
cmg0qxrru00012svgv15zmvpp	https://www.financialexpress.com/life/technology-aadhaar-card-update-september-2025-how-to-change-the-phone-number-linked-to-your-aadhaar-card-3986315/	NEWS	f	2025-09-26 11:16:13.146	2025-09-26 11:16:13.146	cmg0qxrds00002svgxumwrxxi	Aadhaar card update September 2025: How to change the phone number linked to your Aadhaar Card	HOWTO
cmg0qxseq00032svg8dude5a3	https://www.nasdaq.com/articles/xrp-crypto-turning-point-analysts-split-investment-potential-vs-bitcoin	NEWS	f	2025-09-26 11:16:13.97	2025-09-26 11:16:13.97	cmg0qxs6400022svgyte4x59a	XRP Crypto Turning Point: Analysts Split on Investment Potential vs. Bitcoin	ANALYSIS
cmg0iwgk70003laevk6qwz37t	https://www.polygon.com/rog-xbox-ally-x-price-announced/	NEWS	f	2025-09-26 07:31:15.031	2025-09-26 11:16:34.068	cmg0iwfs10000laev9hudeg7n	The ROG Xbox Ally X costs $1000	SALES
cmfzqs1rk000dw79kg1w0fjfz	https://www.barrons.com/articles/bitcoin-ethereum-xrp-price-crypto-8d2f1104	NEWS	t	2025-09-25 18:23:59.984	2025-09-26 13:37:28.088	cmfzqs1jb000bw79k24vr3w21	Bitcoin Price, XRP, Ethereum Fall. Why the Crypto Slump Is Continuing.	ANALYSIS
cmfzqs1rk000ew79kgg9d7upy	https://finance.yahoo.com/news/bitcoin-falls-below-110000-as-cautious-tone-sweeps-over-market-174033262.html	NEWS	t	2025-09-25 18:23:59.984	2025-09-26 13:37:28.088	cmfzqs1jb000bw79k24vr3w21	Bitcoin falls below $110,000 as 'cautious tone' sweeps over market	ANALYSIS
cmfzqs1rk000cw79k3gjusvaq	https://finance.yahoo.com/news/saylor-crypto-imitators-are-now-under-pressure-as-doubts-grow-about-their-business-model-140027268.html	NEWS	t	2025-09-25 18:23:59.984	2025-09-26 13:37:28.088	cmfzqs1jb000bw79k24vr3w21	Saylor crypto imitators are now under pressure as doubts grow about their business model	ANALYSIS
cmg0iwgk70002laevtysh175w	https://www.hollywoodreporter.com/business/business-news/xbox-handheld-prices-rog-ally-x-1236385860/	NEWS	f	2025-09-26 07:31:15.031	2025-09-26 11:16:34.068	cmg0iwfs10000laev9hudeg7n	Xbox Handhelds Will Be More Expensive Than You Thought	RUMOR
cmg0iwgk70001laev1gck0tng	https://www.ign.com/articles/asus-rog-xbox-ally-x-the-final-preview	NEWS	f	2025-09-26 07:31:15.031	2025-09-26 11:16:34.068	cmg0iwfs10000laev9hudeg7n	Asus ROG Xbox Ally X – The Final Preview	REVIEW
\.


--
-- Data for Name: Topic; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Topic" (id, slug, title, status, score, "createdAt", "updatedAt") FROM stdin;
cmfzqjj670000w79kbwo7ev4p	arattai-messaging-app-1758824242520	Arattai Messaging App	NEW	0	2025-09-25 18:17:22.639	2025-09-25 18:17:22.639
cmfzqjjvs0002w79k6c9wxe9g	bitcoin-1758824243503	Bitcoin	NEW	0	2025-09-25 18:17:23.561	2025-09-25 18:17:23.561
cmfzqjkel0005w79kniwnzuzt	forza-horizon-6-1758824244179	Forza Horizon 6	NEW	0	2025-09-25 18:17:24.238	2025-09-25 18:17:24.238
cmfzqjkxc0007w79k0a8qo6q3	borderlands-4-1758824244854	Borderlands 4	NEW	0	2025-09-25 18:17:24.912	2025-09-25 18:17:24.912
cmfzqs0sn0009w79kgooq27vj	arattai-messaging-app-1758824638142	Arattai Messaging App	NEW	0	2025-09-25 18:23:58.728	2025-09-25 18:23:58.728
cmfzqs23d000fw79k3kislloc	tiktok-1758824640347	TikTok	NEW	0	2025-09-25 18:24:00.409	2025-09-25 18:24:00.409
cmfzqs2n7000hw79kbi915041	forza-horizon-6-1758824641061	Forza Horizon 6	NEW	0	2025-09-25 18:24:01.123	2025-09-25 18:24:01.123
cmfzr85hw000jw79kjeixmwd2	arattai-messaging-app-launch-1758825391102	Arattai Messaging App Launch	NEW	0	2025-09-25 18:36:31.316	2025-09-25 18:36:31.316
cmfzr869s000lw79khorkafxq	forza-horizon-6-reveal-1758825392258	Forza Horizon 6 Reveal	NEW	0	2025-09-25 18:36:32.32	2025-09-25 18:36:32.32
cmfzr86tv000nw79kesmlua5n	cryptocurrency-market-analysis-1758825392981	Cryptocurrency Market Analysis	NEW	0	2025-09-25 18:36:33.043	2025-09-25 18:36:33.043
cmg0iwhbu0004laevfbzpmype	crime-and-criminal-tracking-network-system-1758871875890	Crime and Criminal Tracking Network System	NEW	0	2025-09-26 07:31:16.026	2025-09-26 07:31:16.026
cmg0iwigo0006laevghmwj0eh	gta-roleplaying-1758871877372	GTA Roleplaying	NEW	0	2025-09-26 07:31:17.496	2025-09-26 07:31:17.496
cmg0k1bex0008laevr7ym0ve3	accenture-ai-retraining-policy-1758873781072	Accenture AI Retraining Policy	NEW	0	2025-09-26 08:03:01.257	2025-09-26 08:03:01.257
cmg0k1c5h000alaev065xzfg7	rog-xbox-ally-x-launch-1758873782152	ROG Xbox Ally X Launch	NEW	0	2025-09-26 08:03:02.214	2025-09-26 08:03:02.214
cmg0pu5ga00004w1xy5x02bm6	aadhaar-card-update-1758883524508	Aadhaar Card Update	NEW	0	2025-09-26 10:45:24.634	2025-09-26 10:45:24.634
cmg0qmxbe00054w1xanxugftp	aadhaar-card-update-september-2025-1758884866987	Aadhaar Card Update September 2025	NEW	0	2025-09-26 11:07:47.114	2025-09-26 11:07:47.114
cmg0qxrds00002svgxumwrxxi	aadhaar-card-phone-number-update-1758885372448	Aadhaar Card Phone Number Update	NEW	0	2025-09-26 11:16:12.64	2025-09-26 11:16:12.64
cmg0qxs6400022svgyte4x59a	xrp-crypto-analysis-1758885373594	XRP Crypto Analysis	NEW	0	2025-09-26 11:16:13.66	2025-09-26 11:16:13.66
cmg0iwfs10000laev9hudeg7n	rog-xbox-ally-x-1758871873762	ROG Xbox Ally X	NEW	0	2025-09-26 07:31:14.015	2025-09-26 11:16:34.671
cmfzqs1jb000bw79k24vr3w21	cryptocurrency-market-1758824639625	Cryptocurrency Market	APPROVED	0	2025-09-25 18:23:59.687	2025-09-26 13:37:28.754
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."User" (id, email, "passwordHash", role, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Wallet; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Wallet" (id, "userId", coins, tier, "updatedAt") FROM stdin;
\.


--
-- Data for Name: WalletLedger; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."WalletLedger" (id, "userId", event, delta, meta, "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
b94753b1-47ae-48c5-a882-47a996ce64f5	b511b39a91dde87af25e63afe98445f07c1bea45c5abeb04c626ad50609ff1bd	2025-09-25 14:06:24.987629+00	20250924181325_init	\N	\N	2025-09-25 14:06:24.655616+00	1
b6e2b316-f8b4-42a8-9337-0731b6e496d9	c1e20a4ed01542a3153d4420a1909f49763b2dbe27e410c4e99a633412e2c34a	2025-09-25 14:06:25.39805+00	20250924203618_make_url_unique	\N	\N	2025-09-25 14:06:25.104512+00	1
898f7c5e-8b14-4074-a8b4-d823d6526bef	12784c803a0f6edbae2f9cab061ed8b3321d9286fa74bb912d136d8d93d3117e	2025-09-25 14:06:25.805987+00	20250925102033_remove_url_unique	\N	\N	2025-09-25 14:06:25.514617+00	1
77b1ed9f-64ed-44df-965b-6283e3647025	ddb8310d23bab3af1b8e359b2991e25a21ed899a25b1e5d7152ef4baecef0ba7	2025-09-25 14:06:26.214567+00	20250925102353_drop_topic_url_unique	\N	\N	2025-09-25 14:06:25.922238+00	1
dc33789c-73b4-4e50-8620-85ddba061a9e	f71b96a11e5043a958e2eea9aec055be74a7d27f137acf9653194f134e58d51b	2025-09-25 14:06:38.107644+00	20250925140637_add_source_title	\N	\N	2025-09-25 14:06:37.81257+00	1
b1849765-fbc1-4de9-9a00-6e050595667a	d324b428a67ec758afccf10a6a7d2eeebb186dc3f20e0c401a53390bee3ec323	2025-09-25 18:10:20.607892+00	20250925181020_add_content_type	\N	\N	2025-09-25 18:10:20.313365+00	1
b8604afd-7c69-42a3-9d93-666c35bfa065	fe93383a3c99c150661acbee3724b2efb8a3666d6969508a6e9fdb4e757fe5a1	2025-09-26 08:40:47.858413+00	20250926084047_add_categories	\N	\N	2025-09-26 08:40:47.521585+00	1
7061c798-9973-476c-8cc3-40b135429e0f	398fcf7c946c7633d3af9dd95228371fdc2238eea4ca91ee68143efdb78ecfb1	2025-09-26 10:40:22.758521+00	20250926104022_add_ready_status	\N	\N	2025-09-26 10:40:22.451255+00	1
2ec053eb-1fe1-4aac-8b8f-b0729fdba2bf	ed1edafa245ca55504178ec28a8bcba0b40e12482db7b50d549c4290e5101a89	2025-09-26 12:19:15.24409+00	20250926121914_add_article_contenttype_keywords	\N	\N	2025-09-26 12:19:14.950043+00	1
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.categories (id, name, slug, "order", "createdAt", "updatedAt") FROM stdin;
cmg0lko4n0000773akicnt5k1	Gadgets & Devices	gadgets-devices	1	2025-09-26 08:46:03.814	2025-09-26 08:46:03.814
cmg0ll4nt0001773akb5u5pdv	Software & Apps	software-apps	2	2025-09-26 08:46:25.242	2025-09-26 08:46:25.242
cmg0llcn30002773axcg3utjg	Artificial Intelligence	artificial-intelligence	3	2025-09-26 08:46:35.583	2025-09-26 08:46:35.583
cmg0lnfaa0003773aeid3ruv6	Cybersecurity	cybersecurity	4	2025-09-26 08:48:12.322	2025-09-26 08:48:12.322
cmg0lnl7o0004773agfrs78o2	Future Tech & Research	future-tech-research	5	2025-09-26 08:48:20.004	2025-09-26 08:48:20.004
cmg0lnsh10005773afk1gmk7w	Business & Startups	business-startups	6	2025-09-26 08:48:29.414	2025-09-26 08:48:29.414
cmg0lnz2x0006773axygs9tg6	Markets & Products	markets-products	7	2025-09-26 08:48:37.978	2025-09-26 08:48:37.978
cmg0lo49q0007773apedrpj0q	Guides & How-To	guides-how-to	8	2025-09-26 08:48:44.702	2025-09-26 08:48:44.702
cmg0loax90008773axnngglsq	Careers & Learning	careers-learning	9	2025-09-26 08:48:53.325	2025-09-26 08:48:53.325
\.


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.subcategories (id, name, slug, "order", "categoryId", "createdAt", "updatedAt") FROM stdin;
cmg0lplid000a773ax4l0h5c5	Smartphones	smartphones	1	cmg0lko4n0000773akicnt5k1	2025-09-26 08:49:53.698	2025-09-26 08:49:53.698
cmg0lpra5000c773a073k16iq	Laptops & PCs	laptops-pcs	2	cmg0lko4n0000773akicnt5k1	2025-09-26 08:50:01.181	2025-09-26 08:50:01.181
cmg0lpyqy000e773afj9o6sj4	Wearables	wearables	3	cmg0lko4n0000773akicnt5k1	2025-09-26 08:50:10.859	2025-09-26 08:50:10.859
cmg0lq3wm000g773apki4u9ll	Tablets & E-Readers	tablets-e-readers	4	cmg0lko4n0000773akicnt5k1	2025-09-26 08:50:17.543	2025-09-26 08:50:17.543
cmg0lq8y5000i773afq7hoh2n	Home Tech	home-tech	5	cmg0lko4n0000773akicnt5k1	2025-09-26 08:50:24.077	2025-09-26 08:50:24.077
cmg0lqn7q000m773a0f5b9aqn	Operating Systems	operating-systems	1	cmg0ll4nt0001773akb5u5pdv	2025-09-26 08:50:42.566	2025-09-26 08:50:42.566
cmg0lqu0p000o773acnpl15ds	Productivity & Collaboration	productivity-collaboration	2	cmg0ll4nt0001773akb5u5pdv	2025-09-26 08:50:51.385	2025-09-26 08:50:51.385
cmg0lrbwn000s773afyyur0j8	Cameras & Drones	cameras-drones	3	cmg0ll4nt0001773akb5u5pdv	2025-09-26 08:51:14.567	2025-09-26 08:51:14.567
cmg0lrmmj000u773amt2gvtkp	Messaging & Social Apps	messaging-social-apps	4	cmg0ll4nt0001773akb5u5pdv	2025-09-26 08:51:28.46	2025-09-26 08:51:28.46
cmg0lrrkl000w773ag9rtrum2	Creativity Tools	creativity-tools	5	cmg0ll4nt0001773akb5u5pdv	2025-09-26 08:51:34.869	2025-09-26 08:51:34.869
cmg0lsf0k000y773an45lqivz	AI Models	ai-models	1	cmg0llcn30002773axcg3utjg	2025-09-26 08:52:05.253	2025-09-26 08:52:05.253
cmg0lslgk0010773aniddkh1f	AI Applications	ai-applications	2	cmg0llcn30002773axcg3utjg	2025-09-26 08:52:13.604	2025-09-26 08:52:13.604
cmg0lsqpj0012773a4wpxcyf4	AI in Productivity	ai-in-productivity	3	cmg0llcn30002773axcg3utjg	2025-09-26 08:52:20.408	2025-09-26 08:52:20.408
cmg0lsw3h0014773ayslq9yng	Ethics, Bias & Safety	ethics-bias-safety	4	cmg0llcn30002773axcg3utjg	2025-09-26 08:52:27.39	2025-09-26 08:52:27.39
cmg0lt1j90016773ax6e9g9xe	AI Startups & Ecosystem	ai-startups-ecosystem	5	cmg0llcn30002773axcg3utjg	2025-09-26 08:52:34.437	2025-09-26 08:52:34.437
cmg0lt8su0018773ay17i8jfb	Breaches & Threats	breaches-threats	1	cmg0lnfaa0003773aeid3ruv6	2025-09-26 08:52:43.854	2025-09-26 08:52:43.854
cmg0lteoz001a773aqxntx88s	Security Tools	security-tools	2	cmg0lnfaa0003773aeid3ruv6	2025-09-26 08:52:51.491	2025-09-26 08:52:51.491
cmg0ltkf2001c773a2isqk5i8	Privacy & Data Protection	privacy-data-protection	3	cmg0lnfaa0003773aeid3ruv6	2025-09-26 08:52:58.853	2025-09-26 08:52:58.853
cmg0ltr0k001e773auj9hhywj	Regulations & Policies	regulations-policies	4	cmg0lnfaa0003773aeid3ruv6	2025-09-26 08:53:07.46	2025-09-26 08:53:07.46
cmg0ltzfa001g773aecqn0zy5	Cybersecurity Startups	cybersecurity-startups	5	cmg0lnfaa0003773aeid3ruv6	2025-09-26 08:53:18.359	2025-09-26 08:53:18.359
cmg0lue49001i773au1gdrqgc	Quantum Computing	quantum-computing	1	cmg0lnl7o0004773agfrs78o2	2025-09-26 08:53:37.401	2025-09-26 08:53:37.401
cmg0luk3t001k773a0dwhp1rf	Space Tech	space-tech	2	cmg0lnl7o0004773agfrs78o2	2025-09-26 08:53:45.161	2025-09-26 08:53:45.161
cmg0luqzb001m773akzcyu2e7	Robotics & Automation	robotics-automation	3	cmg0lnl7o0004773agfrs78o2	2025-09-26 08:53:54.072	2025-09-26 08:53:54.072
cmg0lux12001o773asixhraco	Green Tech	green-tech	4	cmg0lnl7o0004773agfrs78o2	2025-09-26 08:54:01.91	2025-09-26 08:54:01.91
cmg0lv3p8001q773atq6ec6rd	Human Augmentation	human-augmentation	5	cmg0lnl7o0004773agfrs78o2	2025-09-26 08:54:10.556	2025-09-26 08:54:10.556
cmg0lvjo9001s773avvl6g2be	Big Tech	big-tech	1	cmg0lnsh10005773afk1gmk7w	2025-09-26 08:54:31.257	2025-09-26 08:54:31.257
cmg0lvmkc001u773ao7hc9az4	Startups & Unicorns	startups-unicorns	2	cmg0lnsh10005773afk1gmk7w	2025-09-26 08:54:35.004	2025-09-26 08:54:35.004
cmg0lvsmm001w773ara9ssswo	Venture Capital & Funding	venture-capital-funding	3	cmg0lnsh10005773afk1gmk7w	2025-09-26 08:54:42.862	2025-09-26 08:54:42.862
cmg0lvzxl001y773ahesbhc6g	Mergers & Acquisitions	mergers-acquisitions	4	cmg0lnsh10005773afk1gmk7w	2025-09-26 08:54:52.329	2025-09-26 08:54:52.329
cmg0lw6th0020773adgada6aa	Global Policies & Regulations	global-policies-regulations	5	cmg0lnsh10005773afk1gmk7w	2025-09-26 08:55:01.253	2025-09-26 08:55:01.253
cmg0lwil70022773ad4xm603l	Product Launches	product-launches	1	cmg0lnz2x0006773axygs9tg6	2025-09-26 08:55:16.507	2025-09-26 08:55:16.507
cmg0lwq6e0024773amrlgikm6	Reviews & Public Score	reviews-public-score	2	cmg0lnz2x0006773axygs9tg6	2025-09-26 08:55:26.342	2025-09-26 08:55:26.342
cmg0lww980026773am4vv17ye	Comparisons & Benchmarks	comparisons-benchmarks	3	cmg0lnz2x0006773axygs9tg6	2025-09-26 08:55:34.22	2025-09-26 08:55:34.22
cmg0lx5jo0028773a01txhr55	Sentiment Tracker	sentiment-tracker	4	cmg0lnz2x0006773axygs9tg6	2025-09-26 08:55:46.261	2025-09-26 08:55:46.261
cmg0lxhfz002a773a00yvpoap	Price Watch & Deals	price-watch-deals	5	cmg0lnz2x0006773axygs9tg6	2025-09-26 08:56:01.68	2025-09-26 08:56:01.68
cmg0lxpu8002c773awpbksydm	Beginner Guides	beginner-guides	1	cmg0lo49q0007773apedrpj0q	2025-09-26 08:56:12.561	2025-09-26 08:56:12.561
cmg0lxwwv002e773ap9sso4sd	Advanced Tutorials	advanced-tutorials	2	cmg0lo49q0007773apedrpj0q	2025-09-26 08:56:21.727	2025-09-26 08:56:21.727
cmg0ly2d1002g773a07jhgsgt	Productivity Hacks	productivity-hacks	3	cmg0lo49q0007773apedrpj0q	2025-09-26 08:56:28.789	2025-09-26 08:56:28.789
cmg0lyai0002i773an8iwyfmp	Troubleshooting / Problem Solving	troubleshooting-problem-solving	4	cmg0lo49q0007773apedrpj0q	2025-09-26 08:56:39.337	2025-09-26 08:56:39.337
cmg0lymj3002k773aunvbqge5	Tech Careers & Jobs	tech-careers-jobs	1	cmg0loax90008773axnngglsq	2025-09-26 08:56:54.928	2025-09-26 08:56:54.928
cmg0lytdz002m773a3fslfw2z	Skills & Certifications	skills-certifications	2	cmg0loax90008773axnngglsq	2025-09-26 08:57:03.815	2025-09-26 08:57:03.815
cmg0lz09c002o773at1qc5iag	Online Learning	online-learning	3	cmg0loax90008773axnngglsq	2025-09-26 08:57:12.721	2025-09-26 08:57:12.721
cmg0lz7iq002q773a3qncupb5	Interviews & Industry Voices	interviews-industry-voices	4	cmg0loax90008773axnngglsq	2025-09-26 08:57:22.131	2025-09-26 08:57:22.131
cmg0lziel002s773ak5hb89sc	Student Projects / Research	student-projects-research	5	cmg0loax90008773axnngglsq	2025-09-26 08:57:36.238	2025-09-26 08:57:36.238
\.


--
-- Name: Article Article_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Citation Citation_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Citation"
    ADD CONSTRAINT "Citation_pkey" PRIMARY KEY (id);


--
-- Name: Source Source_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Source"
    ADD CONSTRAINT "Source_pkey" PRIMARY KEY (id);


--
-- Name: Topic Topic_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Topic"
    ADD CONSTRAINT "Topic_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WalletLedger WalletLedger_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."WalletLedger"
    ADD CONSTRAINT "WalletLedger_pkey" PRIMARY KEY (id);


--
-- Name: Wallet Wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Wallet"
    ADD CONSTRAINT "Wallet_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: Article_slug_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Article_slug_key" ON public."Article" USING btree (slug);


--
-- Name: Topic_slug_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Topic_slug_key" ON public."Topic" USING btree (slug);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Wallet_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Wallet_userId_key" ON public."Wallet" USING btree ("userId");


--
-- Name: categories_slug_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);


--
-- Name: Article Article_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."Source"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Article Article_topicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES public."Topic"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Citation Citation_articleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Citation"
    ADD CONSTRAINT "Citation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES public."Article"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Source Source_topicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Source"
    ADD CONSTRAINT "Source_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES public."Topic"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Wallet Wallet_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Wallet"
    ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subcategories subcategories_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: neondb_owner
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

