import React from 'react';
import { connect } from 'react-redux';
import {
	fetchPools,
	fetchPool,
	fetchPrice,
	deletePools,
	selectPool,
	deletePool,
	sumLiquidity,
	clearLiquidity
} from '../actions';
import {
	renderAssets,
	renderTotalLiquidity,
	renderVolume,
	renderFees,
	renderYield,
	checkLiquidity
} from './helpers/balancerHelpers';
import { feeFactor, ratioFactor } from './helpers/factorCalcs';

class PortfolioView extends React.Component {
	async componentDidMount() {
		const pools = this.props.portfolio.split(',');
		for (let pool of pools) {
			await this.props.fetchPool(pool);
			this.props.selectPool(pool);
		}
		if (!this.props.allPools) await this.props.fetchPools();
		if (!this.props.prices['0xba100000625a3754423978a60c9317c58a424e3d']) {
			const addresses = [];
			for (let pool of this.props.allPools) {
				for (let token of pool.tokens) {
					if (addresses.indexOf(token.address) === -1) addresses.push(token.address);
				}
			}
			const a1 = addresses.slice(0, addresses.length / 2);
			const a2 = addresses.slice(addresses.length / 2);
			await this.props.fetchPrice(a1.join(','));
			await this.props.fetchPrice(a2.join(','));
		}
		for (let pool of this.props.allPools) this.adjLiquidity(pool);
	}
	componentWillUnmount() {
		this.props.deletePools();
		this.props.clearLiquidity();
	}
	totalFactor = (pool) => {
		const fee = feeFactor(pool.swapFee);
		const ratio = ratioFactor(pool);
		return fee * ratio;
	};

	adjLiquidity = (pool) => {
		const totalFactor = this.totalFactor(pool);
		const liquidity = renderTotalLiquidity(pool, this.props.prices).split(',').join('');
		this.props.sumLiquidity(liquidity * totalFactor);
	};

	renderAdjLiquidity = (pool) => {
		const totalFactor = this.totalFactor(pool);
		const liquidity = renderTotalLiquidity(pool, this.props.prices).split(',').join('');
		if (isNaN(liquidity / this.props.sumLiq * 14500)) return 0;
		return liquidity * totalFactor / this.props.sumLiq * 145000 * 52;
	};

	renderTotalYield = (pool, prices) => {
		const liquidity = renderTotalLiquidity(pool, this.props.prices).split(',').join('');
		if (isNaN(liquidity / this.props.sumLiq * 14500)) return 0;
		const weekBAL = this.renderAdjLiquidity(pool);
		const feeYield = parseFloat(renderYield(pool, prices)) * 365;
		const priceBAL = this.props.prices['0xba100000625a3754423978a60c9317c58a424e3d'].usd;
		const yieldBAL = parseFloat(weekBAL * priceBAL / liquidity * 100);
		const totalYield = yieldBAL + feeYield;
		return totalYield.toFixed(4);
	};
	renderTable() {
		const pools = this.props.portfolio.split(',');
		return pools.map((pool) => {
			if (this.props.checkPortfolio.indexOf(pool) === -1) return null;
			const selectedPool = this.props.pools[pool];
			if (selectedPool && this.props.prices && this.props.portfolio && this.props.sumLiq > 138683236) {
				const check = parseInt(checkLiquidity(selectedPool, this.props.prices));
				console.log(selectedPool);
				if (check !== 0)
					return (
						<tr onClick={() => this.props.deletePool(selectedPool.id)} key={selectedPool.id}>
							<td className="center aligned" data-label="Pool Address">
								{selectedPool.id}
							</td>
							<td className="center aligned" data-label="Assets">
								{renderAssets(selectedPool)}
							</td>
							<td className="center aligned" data-label="Swap Fee">
								{(selectedPool.swapFee * 100).toFixed(2)}%
							</td>
							<td className="center aligned" data-label="Total Liquidity">
								${renderTotalLiquidity(selectedPool, this.props.prices)}
							</td>
							<td className="center aligned" data-label="24h Trading Volume">
								${renderVolume(selectedPool)}
							</td>
							<td className="center aligned" data-label="24h Fees">
								${renderFees(selectedPool)}
							</td>
							<td className="center aligned" data-label="Annual BAL">
								{this.renderAdjLiquidity(selectedPool).toFixed(0)}
							</td>
							<td className="center aligned" data-label="APY">
								{this.renderTotalYield(selectedPool, this.props.prices)}%
							</td>
						</tr>
					);
				else return null;
			} else return null;
		});
	}

	render() {
		return (
			<div>
				<div className="ui horizontal divider">Show your selected pools here</div>
				<table className="ui inverted striped celled table">
					<thead>
						<tr>
							<th className="center aligned">Pool Address</th>
							<th className="center aligned">Assets</th>
							<th className="center aligned">Swap Fee</th>
							<th className="center aligned">Total Liquidity</th>
							<th className="center aligned">24h Trading Volume</th>
							<th className="center aligned">24h Fees</th>
							<th className="center aligned">Weekly BAL</th>
							<th className="center aligned">APY</th>
						</tr>
					</thead>
					<tbody>{this.renderTable()}</tbody>
				</table>
			</div>
		);
	}
}

const mapStateToProps = (state, ownProps) => {
	return {
		portfolio: ownProps.match.params.portfolio,
		pools: state.poolReducer,
		prices: state.coingecko,
		checkPortfolio: state.portfolio,
		sumLiq: state.sumLiq,
		allPools: state.balancer.pools
	};
};

export default connect(mapStateToProps, {
	fetchPools,
	fetchPool,
	fetchPrice,
	selectPool,
	deletePool,
	deletePools,
	sumLiquidity,
	clearLiquidity
})(PortfolioView);
