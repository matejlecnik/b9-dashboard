#!/usr/bin/env python3
"""
Agent Comparison Analysis - Analyze results from run_agent_comparison.py

Generates:
- Cost comparison
- Speed comparison
- Tag agreement analysis
- Winner recommendation
"""

import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Any


# Paths
RESULTS_DIR = Path(__file__).parent / "results"
METRICS_FILE = RESULTS_DIR / "metrics.json"


def load_results() -> Dict[str, Any]:
    """Load test results from metrics.json"""
    if not METRICS_FILE.exists():
        raise FileNotFoundError(
            f"Results file not found: {METRICS_FILE}\nRun run_agent_comparison.py first."
        )

    return json.loads(METRICS_FILE.read_text())


def analyze_cost_speed(results: List[Dict]) -> Dict[str, Any]:
    """Analyze cost and speed per agent"""
    agent_stats = defaultdict(
        lambda: {
            "total_cost": 0.0,
            "total_time": 0.0,
            "requests": 0,
            "successful": 0,
            "failed": 0,
            "total_tags": 0,
        }
    )

    for result in results:
        agent = result["agent"]
        stats = agent_stats[agent]

        stats["requests"] += 1
        stats["total_cost"] += result.get("cost", 0.0)
        stats["total_time"] += result.get("response_time", 0.0)
        stats["total_tags"] += len(result.get("tags", []))

        if result.get("error"):
            stats["failed"] += 1
        else:
            stats["successful"] += 1

    # Calculate averages
    for agent, stats in agent_stats.items():
        if stats["successful"] > 0:
            stats["avg_cost"] = stats["total_cost"] / stats["successful"]
            stats["avg_time"] = stats["total_time"] / stats["successful"]
            stats["avg_tags"] = stats["total_tags"] / stats["successful"]
        else:
            stats["avg_cost"] = 0.0
            stats["avg_time"] = 0.0
            stats["avg_tags"] = 0.0

        # Calculate production cost for 580 creators
        stats["cost_580_creators"] = stats["avg_cost"] * 580

    return dict(agent_stats)


def analyze_tag_agreement(results: List[Dict]) -> Dict[str, Any]:
    """Calculate inter-agent tag agreement"""
    # Group results by creator
    by_creator = defaultdict(list)
    for result in results:
        if not result.get("error"):
            by_creator[result["username"]].append(result)

    # Calculate agreement per creator
    agreements = []
    for username, creator_results in by_creator.items():
        if len(creator_results) < 2:
            continue

        # Extract all unique tags
        all_tags = set()
        agent_tags = {}
        for result in creator_results:
            tags = set(result.get("tags", []))
            all_tags.update(tags)
            agent_tags[result["agent"]] = tags

        # Calculate pairwise agreement
        agreements_matrix = []
        agent_names = list(agent_tags.keys())

        for i in range(len(agent_names)):
            for j in range(i + 1, len(agent_names)):
                tags_i = agent_tags[agent_names[i]]
                tags_j = agent_tags[agent_names[j]]

                # Jaccard similarity
                intersection = len(tags_i & tags_j)
                union = len(tags_i | tags_j)
                similarity = intersection / union if union > 0 else 0.0

                agreements_matrix.append(
                    {
                        "creator": username,
                        "agent_1": agent_names[i],
                        "agent_2": agent_names[j],
                        "agreement": similarity,
                        "common_tags": intersection,
                        "total_unique_tags": union,
                    }
                )

        agreements.extend(agreements_matrix)

    # Calculate overall agreement
    if agreements:
        avg_agreement = sum(a["agreement"] for a in agreements) / len(agreements)
    else:
        avg_agreement = 0.0

    return {"pairwise_agreements": agreements, "average_agreement": avg_agreement}


def generate_winner_recommendation(agent_stats: Dict) -> str:
    """Generate markdown recommendation for winner"""

    # Sort agents by cost
    sorted_by_cost = sorted(agent_stats.items(), key=lambda x: x[1]["avg_cost"])

    md = "# Agent Comparison - Winner Recommendation\n\n"
    md += "**Generated:** " + Path(METRICS_FILE).stat().st_mtime.__str__() + "\n\n"

    md += "## Cost Ranking\n\n"
    md += "| Rank | Agent | Avg Cost/Creator | Cost for 580 | Success Rate |\n"
    md += "|------|-------|------------------|--------------|-------------|\n"

    for rank, (agent, stats) in enumerate(sorted_by_cost, 1):
        success_rate = (
            (stats["successful"] / stats["requests"] * 100)
            if stats["requests"] > 0
            else 0
        )
        md += f"| {rank} | {agent} | ${stats['avg_cost']:.4f} | ${stats['cost_580_creators']:.2f} | {success_rate:.0f}% |\n"

    md += "\n## Speed Ranking\n\n"
    sorted_by_speed = sorted(agent_stats.items(), key=lambda x: x[1]["avg_time"])

    md += "| Rank | Agent | Avg Response Time |\n"
    md += "|------|-------|-------------------|\n"

    for rank, (agent, stats) in enumerate(sorted_by_speed, 1):
        md += f"| {rank} | {agent} | {stats['avg_time']:.1f}s |\n"

    # Recommendation logic
    md += "\n## Recommendation\n\n"

    # Find cheapest agent with 100% success rate
    best_budget = None
    for agent, stats in sorted_by_cost:
        if stats["successful"] == stats["requests"] and stats["requests"] > 0:
            best_budget = (agent, stats)
            break

    if best_budget:
        agent_name, stats = best_budget
        md += f"**Winner:** {agent_name}\n\n"
        md += f"- **Cost:** ${stats['avg_cost']:.4f} per creator\n"
        md += f"- **580 Creators:** ${stats['cost_580_creators']:.2f}\n"
        md += f"- **Speed:** {stats['avg_time']:.1f}s average\n"
        md += "- **Success Rate:** 100%\n"
        md += f"- **Avg Tags:** {stats['avg_tags']:.1f}\n\n"
        md += "This agent offers the best cost/performance balance with perfect reliability.\n"
    else:
        md += "⚠️ No agent achieved 100% success rate. Manual review recommended.\n"

    # Show premium alternatives
    md += "\n## Premium Alternatives\n\n"
    premium_agents = [a for a, s in agent_stats.items() if s["cost_580_creators"] > 4.0]
    if premium_agents:
        md += "If higher accuracy is needed:\n\n"
        for agent in premium_agents:
            stats = agent_stats[agent]
            md += f"- **{agent}**: ${stats['cost_580_creators']:.2f} for 580 creators\n"

    return md


def main():
    print("=" * 80)
    print("AGENT COMPARISON ANALYSIS")
    print("=" * 80)

    # Load results
    print("\nLoading results...")
    data = load_results()
    results = data["results"]
    print(
        f"✅ Loaded {len(results)} results from {len(set(r['username'] for r in results))} creators"
    )

    # Analyze cost and speed
    print("\nAnalyzing cost and speed...")
    agent_stats = analyze_cost_speed(results)
    print(f"✅ Analyzed {len(agent_stats)} agents")

    # Analyze tag agreement
    print("\nAnalyzing tag agreement...")
    agreement_data = analyze_tag_agreement(results)
    print(f"✅ Average inter-agent agreement: {agreement_data['average_agreement']:.1%}")

    # Generate winner recommendation
    print("\nGenerating winner recommendation...")
    recommendation = generate_winner_recommendation(agent_stats)

    # Save outputs
    (RESULTS_DIR / "cost_speed_analysis.json").write_text(
        json.dumps(agent_stats, indent=2)
    )
    (RESULTS_DIR / "tag_agreement.json").write_text(
        json.dumps(agreement_data, indent=2)
    )
    (RESULTS_DIR / "WINNER_RECOMMENDATION.md").write_text(recommendation)

    print("\n✅ Analysis complete!")
    print("\nOutput files:")
    print("  - cost_speed_analysis.json")
    print("  - tag_agreement.json")
    print("  - WINNER_RECOMMENDATION.md")

    # Print quick summary
    print("\n" + "=" * 80)
    print("QUICK SUMMARY")
    print("=" * 80)

    sorted_by_cost = sorted(
        agent_stats.items(), key=lambda x: x[1]["cost_580_creators"]
    )
    print("\nTop 3 by cost (580 creators):")
    for i, (agent, stats) in enumerate(sorted_by_cost[:3], 1):
        print(f"  {i}. {agent:<30} ${stats['cost_580_creators']:>8.2f}")

    print(f"\nAverage tag agreement: {agreement_data['average_agreement']:.1%}")
    print("=" * 80)


if __name__ == "__main__":
    main()
