import {
	Box,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	IconButton,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PawCoin from "../../components/PawCoin";
import { AttentionSeeker, Bounce } from "react-awesome-reveal";


export default function RewardModal({
	open,
	onClose,
	minutes = 0,
	tasks = 0,
	cat,
	coinsEarned = 0,
	blockCompleted = false,
}) {
	return (
		<Dialog open={open} onClose={onClose}>
			<DialogTitle>Rewards!</DialogTitle>
			<DialogContent sx={{padding: 5}}>
				<Stack direction="row" sx={{display: 'flex', alignItems: "center", justifyContent: "center"}}>
                    <Bounce>

					<Box
						component="img"
						src={cat?.image}
						sx={{ objectFit: "cover", width: "10em" }}
                        ></Box>
                        </Bounce>
					<Stack spacing={2}>
						<Typography align="center">
							{cat?.name} found {coinsEarned} coins while playing!
						</Typography>

                        <Divider sx={{width: "100%"}}></Divider>

                        <Typography align="center" variant="body2">
                            Minutes Worked: {minutes}
                        </Typography>

                        <Divider sx={{width: "100%"}}></Divider>

                        <Typography align="center" variant="body2">
                            Tasks Completed: {tasks}
                        </Typography>

                        <Divider sx={{width: "100%"}}></Divider>

						<Stack
							direction="row"
							spacing={0.5}
							sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
						>
							<Tooltip
								title={`(${cat?.name}'s energy determines the maximum number of coins you can get. This will recharge during your break!)`}
								arrow
							>
								<IconButton
									size="small"
									aria-label="energy info"
									sx={{ p: 0.25, color: "text.secondary" }}
								>
									<InfoOutlinedIcon sx={{ fontSize: "1rem" }} />
								</IconButton>
							</Tooltip>
							<Typography align="center" variant="body2">
								{cat?.name}'s energy: {cat?.energy}
							</Typography>
						</Stack>

                        <Divider sx={{width: "100%"}}></Divider>

						{blockCompleted && (
							<Typography align="center" variant="body2" sx={{ color: "warning.main", fontWeight: "bold" }}>
								🔋 You completed a 4-cycle block! Energy decreased.
							</Typography>
						)}

						<Stack direction="row" spacing={1} sx={{display: "flex", alignItems: "center", justifyContent: "center"}}>
                            <AttentionSeeker effect="tada">
                            <PawCoin/>
                            </AttentionSeeker>
							<Typography> x {coinsEarned}</Typography>
						</Stack>
					</Stack>
				</Stack>
			</DialogContent>
		</Dialog>
	);
}
