
import random


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
def print_payoff_matrix(matrix):
    for row in matrix:
        print(row)  
def play_game(x,y, turn) :
    xc = random.randint(0, len(payoff_matrix)-1)
    yc = random.randint(0, len(payoff_matrix)-1)
    if turn == "seeker":
        if xc == x and yc == y:
            print("you win! Hider was at ({}, {})".format(xc, yc))
        else: 
            print("you lost! Hider was at ({}, {})".format(xc, yc))
    else:
        if xc == x and yc == y:
            print("you lost ! your place is known ({}, {})".format(xc, yc))
        else: 
            print("you win ! nice hide ({}, {})".format(xc, yc))
        
    
payoff_matrix = initialize_solver(3)
play_game(1, 2, "hider")
# print(list(range(10)))
