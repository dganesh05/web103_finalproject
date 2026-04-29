import {
	Button,
	Stack,
	Paper,
	Grid,
	Typography,
	Box,
	Container,
	CircularProgress,
} from "@mui/material";

import StoreIcon from "@mui/icons-material/Store";
import ShopCard from "../../components/ShopCard.jsx";
import { useContext, useState, useEffect } from "react";
import { AttentionSeeker } from "react-awesome-reveal";
import PawCoin from "../../components/PawCoin.jsx";
import AuthContext from "../../contexts/AuthContext";

export default function Shop() {
	const [shopItems, setShopItems] = useState([]);
	const [activeFilter, setActiveFilter] = useState(null);
	const [loading, setLoading] = useState(true);
	const [coins, setCoins] = useState();
	const [inventory, setInventory] = useState()

	const { user } = useContext(AuthContext);

	useEffect(() => {
		const fetchShopItems = async () => {
			try {
				const res = await fetch("/api/shop_items");
				const data = await res.json();
				setShopItems(data);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchShopItems();
	}, []);

	useEffect(() => {
		const fetchUserCoins = async () => {
			if (!user?.uid) {
				setCoins(0);
				return;
			}

			try {
				const response = await fetch(`/api/users/${user.uid}`);
				if (!response.ok) {
					throw new Error(`Failed to fetch user coins (${response.status})`);
				}

				const data = await response.json();
				setCoins(Number(data?.coins ?? 0));
			} catch (err) {
				console.error(err);
				setCoins(0);
			}
		};

		
		const fetchUserInventory = async () => {
			if (!user.uid) {
				return
			}
			
			try {
				const response = await fetch(`/api/inventory/${user.uid}`)
				if (!response.ok) {
					throw new Error(`Failed to fetch user inventory (${response.status})`)
				}
				
				const data = await response.json()
				setInventory(data)
			} catch (err) {
				console.error(err)
			}
		}
		
		fetchUserCoins();
		fetchUserInventory()
		// listen for global coin updates from purchases
		const onCoinsUpdated = (e) => {
			if (e?.detail?.coins != null) setCoins(Number(e.detail.coins));
		};

		window.addEventListener('userCoinsUpdated', onCoinsUpdated);

		return () => window.removeEventListener('userCoinsUpdated', onCoinsUpdated);
	}, [user?.uid]);

	function handleFilterClick(category) {
		if (activeFilter === category) {
			setActiveFilter(null);
		} else {
			setActiveFilter(category);
		}
	}

	const displayShopItems = activeFilter
		? shopItems.filter((e) => e.category === activeFilter && !inventory?.some(inv => inv.shopitemid === e.id))
		: shopItems.filter((e) => !inventory?.some(inv => inv.shopitemid === e.id));

	return (
		<Box sx={{ pt: 4, pb: 10, px: { xs: 2, sm: 3, md: 4, backgroundColor: "#f4f3ec" } }}>
			{/* title of the page + filter buttons based on categories */}
			<Box sx={{ pb: 5 }}>
				<Stack
					spacing={2}
					direction={{ xs: "column", md: "row" }}
					sx={{
						justifyContent: { xs: "flex-start", md: "space-between" },
						alignItems: { xs: "flex-start", md: "center" },
					}}
				>
					<Typography variant="h2" sx={{ paddingLeft: 5 }}>
						<StoreIcon
							sx={{
								fontSize: 70,
								color: "primary.main",
								position: "relative",
								top: "10px",
							}}
						/>
						PawMart
					</Typography>
					<Box
						sx={{
							alignContent: "center",
							display: "flex",
							flexDirection: "row-reverse",
							gap: 1,
							p: 2,
							m: 2,
						}}
					>
						<Button
							variant={activeFilter === "Lamps" ? "contained" : "outlined"}
							onClick={() => handleFilterClick("Lamps")}
						>
							Lamps
						</Button>
						<Button
							variant={activeFilter === "Desks" ? "contained" : "outlined"}
							onClick={() => handleFilterClick("Desks")}
						>
							Desks
						</Button>
						<Button
							variant={activeFilter === "Plants" ? "contained" : "outlined"}
							onClick={() => handleFilterClick("Plants")}
						>
							Plants
						</Button>
						<Button
							variant={activeFilter === "Frames" ? "contained" : "outlined"}
							onClick={() => handleFilterClick("Frames")}
						>
							Frames
						</Button>
					</Box>
				</Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", paddingLeft: 6, pt: 2 }}>
                    <AttentionSeeker effect="tada">
                        <PawCoin />
                    </AttentionSeeker>
                    <Typography> x {coins}</Typography>
                </Stack>
			</Box>
            
			{/* displaying data on grid format, all shop items on display unless a filter button is clicked */}
			<Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", pt: 25 }}>
						<CircularProgress size={100} />
					</Box>
				) : (
					<Grid container spacing={2} sx={{ width: "100%" }}>
						{displayShopItems
							.map((shopItem) => (
								<Grid key={shopItem.id} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
									<ShopCard shopItem={shopItem} coins={coins} />
								</Grid>
							))}
					</Grid>
				)}
			</Box>
		</Box>
	);
}
