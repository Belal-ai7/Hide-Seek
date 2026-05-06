
import random
import cplex
class HideAndSeekGame:
    def __init__(self, num_places):
        self.num_places = num_places
        self.payoff_matrix = self.initialize_solver(num_places)

    @staticmethod
    def initialize_solver(num_places):
        places_criteria = [random.randint(1, 3) for _ in range(num_places)]
        category_names = {
            1: "easy",
            2: "neutral",
            3: "hard"
        }
        places =[category_names[c] for c in places_criteria] ;
        print("Places criteria:", places_criteria)
        print(places)
        payoff_matrix = [[0]*num_places for _ in range(num_places)]
        for i, k in enumerate(places_criteria):
                if category_names[k]== "easy":
                    for j in range(num_places):
                        if j == i :
                            payoff_matrix[i][j] =-1 ;
                        else:
                            payoff_matrix[i][j] = 2 ;
                elif category_names[k]== "neutral":
                    for j in range(num_places):
                        if j == i :
                            payoff_matrix[i][j] =-1 ;
                        else:
                            payoff_matrix[i][j] = 1 ;
                else:  # hard
                    for j in range(num_places):
                        if j == i :
                            payoff_matrix[i][j] =-3 ;
                        else:
                            payoff_matrix[i][j] = 1 ;
        return payoff_matrix

    @staticmethod
    def print_payoff_matrix(matrix):
        for row in matrix:
            print(row)

    @staticmethod
    def play_game(place, turn, num_places):
        xc = random.randint(0, num_places - 1)
        if turn == "seeker":
            winner = "seeker" if xc == place else "hider"
        else:
            winner = "hider" if xc == place else "seeker"
        return {
            "opponent_place": xc,
            "winner": winner,
            "message": "You win!" if winner == turn else "You lose."
        }

    @staticmethod
    def simulate_game(num_places, num_rounds=100):
        player_score = 0
        computer_score = 0
        rounds_won_player = 0
        rounds_won_computer = 0
        for _ in range(num_rounds):
            role = random.choice(["hider", "seeker"])
            place = random.randint(0, num_places - 1)
            result = HideAndSeekGame.play_game(place, role, num_places)
            if result["winner"] == role:
                player_score += 1
                rounds_won_player += 1
            else:
                computer_score += 1
                rounds_won_computer += 1
        return {
            "total_rounds": num_rounds,
            "player_score": player_score,
            "computer_score": computer_score,
            "rounds_won_player": rounds_won_player,
            "rounds_won_computer": rounds_won_computer
        }


    @staticmethod
    def solve_payoff_matrix(payoff_matrix):
        myproblem = cplex.Cplex()
        myproblem.objective.set_sense(myproblem.objective.sense.maximize)

        m = len(payoff_matrix)        # rows (Player A strategies)
        n = len(payoff_matrix[0])     # columns (Player B strategies)

        # Variables: x_i (probabilities) + v (game value)
        x_names = [f"x{i}" for i in range(m)]
        x = myproblem.variables.add(names=x_names, lb=[0.0]*m)
        v_name = ["v"]
        v = myproblem.variables.add(names=v_name, lb=[-cplex.infinity])

        # Constraint: sum x_i = 1
        myproblem.linear_constraints.add(
            lin_expr=[cplex.SparsePair(ind=x_names, val=[1.0]*m)],
            senses=["E"],
            rhs=[1.0]
        )

        # Constraints: for each column j
        for j in range(n):
            ind = x_names + v_name
            val = [payoff_matrix[i][j] for i in range(m)] + [-1.0]

            myproblem.linear_constraints.add(
                lin_expr=[cplex.SparsePair(ind=ind, val=val)],
                senses=["G"],   # ≥
                rhs=[0.0]
            )

        # Objective: maximize v
        myproblem.objective.set_linear("v", 1.0)

        # Solve
        myproblem.solve()

        # Extract solution
        optimal_strategy = myproblem.solution.get_values(x_names)
        game_value = myproblem.solution.get_values("v")

        print("Optimal strategy:", optimal_strategy)
        print("Game value:", game_value)

        return optimal_strategy, game_value


        

